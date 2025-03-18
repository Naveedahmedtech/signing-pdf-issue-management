import { Component, OnInit } from '@angular/core';
import { AnnotationToolsService } from './annotation-tools.service';
import { RXCore } from 'src/rxcore';
import { RxCoreService } from 'src/app/services/rxcore.service';
import { MARKUP_TYPES } from 'src/rxcore/constants';
import { IGuiConfig } from 'src/rxcore/models/IGuiConfig';
import { UserService } from '../user/user.service';
import { first, firstValueFrom, lastValueFrom, Subscription } from 'rxjs';
import { SignatureService } from '../signature/signature.service';
import { AdoptSignatureService } from '../signature/adopt-signature/adopt-signature.service';
import { EventCommunicationService } from 'src/app/services/event-communication.service';
import { NEST_URL } from 'src/app/constants';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Component({
  selector: 'rx-annotation-tools',
  templateUrl: './annotation-tools.component.html',
  styleUrls: ['./annotation-tools.component.scss'],
})
export class AnnotationToolsComponent implements OnInit {
  private subscription!: Subscription;

  guiConfig$ = this.rxCoreService.guiConfig$;
  opened$ = this.service.opened$;
  guiConfig: IGuiConfig | undefined;
  shapesAvailable: number = 5;
  reactSource: string | null;
  isCreateIssueModalOpen: boolean = false;
  isActive: boolean = false;
  issueTitle: string = '';
  issueDescription: string = '';
  issueStatus: string = 'To Do'; // Default status
  issueStartDate: string = ''; // ISO string or Date object
  issueEndDate: string = ''; // ISO string or Date object
  issueFiles: File[] = []; // Array of files
  issueProjectId: string = ''; // Project ID
  isLoading: boolean = false; // To show/hide loading spinner
  successMessage: string = ''; // To show success messages
  errorMessage: string = ''; // To show error messages
  // Temporary variable to hold title input from the title modal
  tempIssueTitle: string = '';
  isIssueTitleModalOpen: boolean = false;
  templates: any = [];
  createdAnnotation: boolean = false;
  imagePreview: string | null = null;
  base64Image: string | null = null;

  isActionSelected = {
    TEXT: false,
    CALLOUT: false,
    SHAPE_RECTANGLE: false,
    SHAPE_RECTANGLE_ROUNDED: false,
    SHAPE_ELLIPSE: false,
    SHAPE_CLOUD: false,
    SHAPE_POLYGON: false,
    NOTE: false,
    ERASE: false,
    ARROW_FILLED_BOTH_ENDS: false,
    ARROW_FILLED_SINGLE_END: false,
    ARROW_BOTH_ENDS: false,
    ARROW_SINGLE_END: false,
    PAINT_HIGHLIGHTER: false,
    PAINT_FREEHAND: false,
    PAINT_TEXT_HIGHLIGHTING: false,
    PAINT_POLYLINE: false,
    COUNT: false,
    STAMP: false,
    SCALE_SETTING: false,
    IMAGES_LIBRARY: false,
    SYMBOLS_LIBRARY: false,
    LINKS_LIBRARY: false,
    CALIBRATE: false,
    MEASURE_CONTINUOUS: false,
    MEASURE_LENGTH: false,
    MEASURE_AREA: false,
    MEASURE_PATH: false,
    SNAP: false,
    MARKUP_LOCK: false,
    NO_SCALE: false,
  };

  get isPaintSelected(): boolean {
    return (
      this.isActionSelected['PAINT_HIGHLIGHTER'] ||
      this.isActionSelected['PAINT_FREEHAND'] ||
      this.isActionSelected['PAINT_TEXT_HIGHLIGHTING'] ||
      this.isActionSelected['PAINT_POLYLINE']
    );
  }

  get isShapeSelected(): boolean {
    return (
      this.isActionSelected['SHAPE_RECTANGLE'] ||
      this.isActionSelected['SHAPE_RECTANGLE_ROUNDED'] ||
      this.isActionSelected['SHAPE_ELLIPSE'] ||
      this.isActionSelected['SHAPE_CLOUD'] ||
      this.isActionSelected['SHAPE_POLYGON']
    );
  }

  get isArrowSelected(): boolean {
    return (
      this.isActionSelected['ARROW_FILLED_BOTH_ENDS'] ||
      this.isActionSelected['ARROW_FILLED_SINGLE_END'] ||
      this.isActionSelected['ARROW_BOTH_ENDS'] ||
      this.isActionSelected['ARROW_SINGLE_END']
    );
  }

  get isMeasureSelected(): boolean {
    return (
      this.isActionSelected['MEASURE_LENGTH'] ||
      this.isActionSelected['MEASURE_AREA'] ||
      this.isActionSelected['MEASURE_PATH']
    );
  }

  canAddAnnotation = this.userService.canAddAnnotation$;
  canUpdateAnnotation = this.userService.canUpdateAnnotation$;
  canDeleteAnnotation = this.userService.canDeleteAnnotation$;

  constructor(
    private readonly service: AnnotationToolsService,
    private readonly rxCoreService: RxCoreService,
    private readonly userService: UserService,
    private readonly signatureService: SignatureService,
    private readonly adoptSignatureService: AdoptSignatureService,
    private eventService: EventCommunicationService,
    private http: HttpClient,

  ) {}

  ngOnInit(): void {
    this.updateStamps(this.issueTitle);
    this.subscription = this.eventService.statusUpdated.subscribe((status: boolean) => {
      this.isActive = status;
      console.log("Receiver Component: Status updated to", this.isActive);
    });
    this.adoptSignatureService.reactSource$.subscribe(
      (source) => (this.reactSource = source)
    );
    this.guiConfig$.subscribe((config) => {
      this.guiConfig = config;

      this.shapesAvailable =
        Number(!this.guiConfig.disableMarkupShapeRectangleButton) +
        Number(!this.guiConfig.disableMarkupShapeRoundedRectangleButton) +
        Number(!this.guiConfig.disableMarkupShapeEllipseButton) +
        Number(!this.guiConfig.disableMarkupShapeCloudButton) +
        Number(!this.guiConfig.disableMarkupShapePolygonButton);
    });

    this.rxCoreService.guiState$.subscribe((state) => {
      this._deselectAllActions();
      //this.service.setNotePanelState({ visible: false });
      //this.service.hideQuickActionsMenu();
      //this.service.setNotePopoverState({visible: false, markup: -1});
      //this.service.hide();
      //this.service.setMeasurePanelState({ visible: false });
    });

    this.rxCoreService.guiTextInput$.subscribe(({ rectangle, operation }) => {
      if (operation === -1) return;

      if (operation.start) {
        this._deselectAllActions();
      }
    });

    this.rxCoreService.guiMarkup$.subscribe(({ markup, operation }) => {
      if (markup !== -1) {
        if (markup.type == MARKUP_TYPES.COUNT.type) return;
        if (markup.type == MARKUP_TYPES.STAMP.type) {
          if (operation?.created) return;
          this.isActionSelected['STAMP'] = false;
        }
      }

      if (markup === -1 || operation?.created) {
        const selectedAction = Object.entries(this.isActionSelected).find(
          ([key, value]) => value
        );

        //console.log("reset to default tool here");
        if (operation?.created) {
          this._deselectAllActions();
        }
        //this._deselectAllActions();

        if (operation?.created && this.shapesAvailable == 1 && selectedAction) {
          this.onActionSelect(selectedAction[0]);
        }
      }
    });

    this.service.measurePanelState$.subscribe((state) => {
      this.isActionSelected['SCALE_SETTING'] = state.visible;

      /*if(state.visible && this.isActionSelected['SCALE_SETTING'] === false){
        // this.onActionSelect('SCALE_SETTING');    
        this.isActionSelected['SCALE_SETTING'] = true;
      }*/
    });

    this.service.imagePanelState$.subscribe((state) => {
      this.isActionSelected['IMAGES_LIBRARY'] = state.visible;
    });
    this.service.symbolPanelState$.subscribe((state) => {
      this.isActionSelected['SYMBOLS_LIBRARY'] = state.visible;
    });
    this.service.linkPanelState$.subscribe((state) => {
      this.isActionSelected['LINKS_LIBRARY'] = state.visible;
    });

    this.service.snapState$.subscribe((state) => {
      if (state) {
        this.isActionSelected['SNAP'] = state;
      }
    });
  }

  private _deselectAllActions(): void {
    Object.entries(this.isActionSelected).forEach(([key, value]) => {
      if (
        key !== 'MARKUP_LOCK' &&
        key !== 'SNAP' &&
        key !== 'NO_SCALE' &&
        key !== 'MEASURE_CONTINUOUS'
      ) {
        this.isActionSelected[key] = false;
      }

      /*case 'MARKUP_LOCK' :
        RXCore.lockMarkup(this.isActionSelected[actionName]);
        break;*/

      /*if (key == 'NOTE') {
        RXCore.markUpNote(false);
      }*/
    });

    console.log('deselect all called');
    RXCore.restoreDefault();
    //this.service.hideQuickActionsMenu();
    //this.service.setNotePanelState({ visible: false });
    //this.service.setPropertiesPanelState({ visible: false });
    //this.service.setMeasurePanelState({ visible: false });
    //this.service.setMeasurePanelDetailState({ visible: false });
  }

  onAddClick(): void {
    this.signatureService.adoptSignatureOpened.next({
      opened: true,
      mode: 'create',
    });
  }

  updateStamps(issueName: string) {
    this.templates = [this.generateStampTemplate(issueName)];
  }

  // Open the Issue Title Modal
  openIssueTitleModal() {
    // If a title was already saved, preload it into the temp variable
    this.tempIssueTitle = this.issueTitle || '';
    this.isIssueTitleModalOpen = true;
  }
  // Close the Issue Title Modal without saving
  closeIssueTitleModal() {
    console.log('closing issue title modal: ', this.isIssueTitleModalOpen);
    this.isIssueTitleModalOpen = false;
    console.log('closed issue title modal: ', this.isIssueTitleModalOpen);
  }

  // Save the title and close the Issue Title Modal
  onNextIssueTitle() {
    if (this.tempIssueTitle.trim()) {
      this.issueTitle = this.tempIssueTitle;
      // this.isIssueTitleModalOpen = false;
      // Ensure issueTitle is updated before calling updateStamps()
      setTimeout(() => {
        console.log('Issue Title before updateStamps:', this.issueTitle);
        this.updateStamps(this.issueTitle);
      });
    } else {
      // Optionally display an error message for an empty title
      this.errorMessage = 'Please enter a valid title.';
    }
  }

  generateStampTemplate(issueName: string) {
    console.log('Generating....', issueName);
    const maxLength = 15;
    let displayName = issueName;
    if (issueName.length > maxLength) {
      displayName = issueName.slice(0, maxLength - 3) + '...';
    }
    const svgString = `
                  <svg
                    viewBox="0 0 200 220"
                    xmlns="http://www.w3.org/2000/svg"
                    class="hazard-icon"
                  >
                    <polygon
                      points="100,20 20,180 180,180"
                      fill="none"
                      stroke="black"
                      stroke-width="14"
                      stroke-linejoin="round"
                    />

                    <line
                      x1="100" y1="60"
                      x2="100" y2="130"
                      stroke="black"
                      stroke-width="10"
                      stroke-linecap="round"
                    />
                    <circle
                      cx="100" cy="155"
                      r="7"
                      fill="black"
                    />

                    <text
                      x="100"
                      y="210"
                      font-family="Arial, sans-serif"
                      font-size="30"
                      text-anchor="middle"
                      fill="#000"
                      font-weight="bold"
                    >
                      ${displayName}
                    </text>
                  </svg>
    `;

    return {
      id: 5,
      src: window.URL.createObjectURL(
        new Blob([svgString], { type: 'image/svg+xml' })
      ),
      height: 120,
      width: 120,
    };
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        console.log("---> Trying to upload the Annotation: ", e.target.result);
        this.imagePreview = e.target.result; // Convert image to base64 for preview
        const img = new Image();
        img.src = e.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxWidth = 800; // Resize width (adjust if needed)
          const maxHeight = 800; // Resize height (adjust if needed)
          let width = img.width;
          let height = img.height;
  
          // Resize logic
          if (width > maxWidth || height > maxHeight) {
            if (width > height) {
              height *= maxWidth / width;
              width = maxWidth;
            } else {
              width *= maxHeight / height;
              height = maxHeight;
            }
          }
  
          // Set canvas size
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
  
          // Get MIME type based on file extension
          const fileType = file.type || 'image/jpeg'; // Default to JPEG if type is missing
  
          // Convert to Base64 format (keeping prefix for backend)
          this.base64Image = canvas.toDataURL(fileType, 0.7); // Compress image to 70% quality
          console.log("base64", this.base64Image)
        };
      };
      reader.readAsDataURL(file);
    }
  }

  onActionSelect(actionName: string) {
    const selected = this.isActionSelected[actionName];
    this._deselectAllActions();
    this.isActionSelected[actionName] = !selected;
    if (actionName) {
      this.rxCoreService.resetLeaderLine(true);
    }

    switch (actionName) {
      case 'TEXT':
        RXCore.markUpTextRect(this.isActionSelected[actionName]);
        break;

      case 'CALLOUT':
        RXCore.markUpTextRectArrow(this.isActionSelected[actionName]);
        break;

      case 'SHAPE_RECTANGLE':
        RXCore.setGlobalStyle(true);
        RXCore.markUpShape(this.isActionSelected[actionName], 0);
        break;

      case 'SHAPE_RECTANGLE_ROUNDED':
        RXCore.setGlobalStyle(true);
        RXCore.markUpShape(this.isActionSelected[actionName], 0, 1);
        break;

      case 'SHAPE_ELLIPSE':
        RXCore.setGlobalStyle(true);
        RXCore.markUpShape(this.isActionSelected[actionName], 1);
        break;

      case 'SHAPE_CLOUD':
        RXCore.setGlobalStyle(true);
        if (this.shapesAvailable == 1) {
          RXCore.changeFillColor('A52A2AFF');
          RXCore.markUpFilled();
          RXCore.changeTransp(20);
        }
        RXCore.markUpShape(this.isActionSelected[actionName], 2);
        break;

      case 'SHAPE_POLYGON':
        RXCore.setGlobalStyle(true);
        RXCore.markUpShape(this.isActionSelected[actionName], 3);
        break;

      case 'NOTE':
        RXCore.markUpNote(this.isActionSelected[actionName]);
        //this.service.setNotePanelState({ visible: this.isActionSelected[actionName] });
        break;

      case 'ERASE':
        RXCore.markUpErase(this.isActionSelected[actionName]);
        break;

      case 'ARROW_SINGLE_END':
        RXCore.setGlobalStyle(true);
        RXCore.markUpArrow(this.isActionSelected[actionName], 0);
        break;

      case 'ARROW_FILLED_SINGLE_END':
        RXCore.setGlobalStyle(true);
        RXCore.markUpArrow(this.isActionSelected[actionName], 1);
        break;

      case 'ARROW_BOTH_ENDS':
        RXCore.setGlobalStyle(true);
        RXCore.markUpArrow(this.isActionSelected[actionName], 2);
        break;

      case 'ARROW_FILLED_BOTH_ENDS':
        RXCore.setGlobalStyle(true);
        RXCore.markUpArrow(this.isActionSelected[actionName], 3);
        break;

      case 'PAINT_HIGHLIGHTER':
        RXCore.markUpHighlight(this.isActionSelected[actionName]);
        break;

      case 'PAINT_FREEHAND':
        RXCore.markUpFreePen(this.isActionSelected[actionName]);
        if (!this.isActionSelected[actionName]) {
          RXCore.selectMarkUp(true);
        }
        break;

      case 'PAINT_TEXT_HIGHLIGHTING':
        RXCore.textSelect(this.isActionSelected[actionName]);
        break;

      case 'PAINT_POLYLINE':
        RXCore.markUpPolyline(this.isActionSelected[actionName]);
        break;

      case 'STAMP':
        break;

      case 'SCALE_SETTING':
        this.service.setMeasurePanelState({
          visible: this.isActionSelected[actionName],
        });
        break;

      case 'IMAGES_LIBRARY':
        this.service.setImagePanelState({
          visible: this.isActionSelected[actionName],
        });
        break;
      case 'LINKS_LIBRARY':
        this.service.setLinksPanelState({
          visible: this.isActionSelected[actionName],
        });
        break;
      case 'SYMBOLS_LIBRARY':
        this.service.setSymbolPanelState({
          visible: this.isActionSelected[actionName],
        });
        break;

      /*case 'CALIBRATE':
          //RXCore.calibrate(true);
          this.calibrate(true);
          break;*/

      case 'MEASURE_CONTINUOUS':
        RXCore.markupAddMulti(this.isActionSelected[actionName]);
        break;

      case 'MEASURE_LENGTH':
        //MeasureDetailPanelComponent
        this.service.setMeasurePanelDetailState({
          visible: this.isActionSelected[actionName],
          type: MARKUP_TYPES.MEASURE.LENGTH.type,
          created: true,
        });
        //this.annotationToolsService.setMeasurePanelState({ visible: true });
        //this.service.setPropertiesPanelState({ visible: this.isActionSelected[actionName], markup: MARKUP_TYPES.MEASURE.LENGTH,  readonly: false });
        RXCore.markUpDimension(this.isActionSelected[actionName], 0);
        break;

      case 'MEASURE_AREA':
        this.service.setMeasurePanelDetailState({
          visible: this.isActionSelected[actionName],
          type: MARKUP_TYPES.MEASURE.AREA.type,
          created: true,
        });
        //this.service.setPropertiesPanelState({ visible: this.isActionSelected[actionName], markup: MARKUP_TYPES.MEASURE.AREA, readonly: false });
        RXCore.markUpArea(this.isActionSelected[actionName]);
        break;

      case 'MEASURE_PATH':
        this.service.setMeasurePanelDetailState({
          visible: this.isActionSelected[actionName],
          type: MARKUP_TYPES.MEASURE.PATH.type,
          created: true,
        });
        //this.service.setPropertiesPanelState({ visible: this.isActionSelected[actionName], markup:  MARKUP_TYPES.MEASURE.PATH, readonly: false });
        RXCore.markupMeasurePath(this.isActionSelected[actionName]);
        break;
      case 'MEASURE_RECTANGULAR_AREA':
        this.service.setMeasurePanelDetailState({
          visible: this.isActionSelected[actionName],
          type: MARKUP_TYPES.SHAPE.RECTANGLE.type,
          created: true,
        });
        RXCore.markupAreaRect(this.isActionSelected[actionName]);
        break;
      case 'SNAP':
        RXCore.changeSnapState(this.isActionSelected[actionName]);
        break;
      case 'COUNT':
        if (!this.isActionSelected[actionName]) {
          RXCore.markupCount(this.isActionSelected[actionName]);
        }
        break;
      case 'MARKUP_LOCK':
        RXCore.lockMarkup(this.isActionSelected[actionName]);
        break;

      case 'NO_SCALE':
        RXCore.useNoScale(this.isActionSelected[actionName]);
        RXCore.markUpRedraw();
        break;
    }
  }

  onPaintClick(): void {
    if (this.isActionSelected['PAINT_FREEHAND']) {
      this.onActionSelect('PAINT_FREEHAND');
    }
  }

  
  // Open the "Create Issue" modal
  openCreateIssueModal(): void {
    this.isCreateIssueModalOpen = true;
  }

  // Close the "Create Issue" modal
  closeCreateIssueModal(): void {
    console.log('closed the modal: ---> ', this.isCreateIssueModalOpen)
    this.isCreateIssueModalOpen = false;
  }

  formatDate(date: string | null): string {
    if (!date) return '';
    const d = new Date(date);
    return d.toISOString().split('T')[0]; // Extract YYYY-MM-DD from ISO format
  }

  // Handle "Create Issue" form submission
  onSubmitCreateIssue(): void {
    this.isLoading = true; // Show loading
    this.successMessage = '';
    this.errorMessage = '';

    this.adoptSignatureService.projectId$.pipe(first()).subscribe((projectId) => {

      this.adoptSignatureService.userId$.pipe(first()).subscribe((userId) => {

        if (!this.issueTitle.trim() || !projectId || !userId) {
          this.isLoading = false;
          this.errorMessage = '⚠️ Title, projectId, and userId are required!';
          return;
        }

        const issueData = {
          title: this.issueTitle,
          description: this.issueDescription,
          startDate: this.formatDate(this.issueStartDate),
          endDate: this.formatDate(this.issueEndDate),
          status: this.issueStatus,
          userId: userId,
          projectId: projectId,
          image: this.base64Image || null,
        };

        // Step 1: Create the Issue first
        this.createIssue(issueData)
          .then((issueId) => {

            // Step 2: Store issueId properly
            this.adoptSignatureService.setIssueId(issueId);

            // Step 3: Ensure file upload happens AFTER issueId is properly stored
            setTimeout(() => {
              this.adoptSignatureService.triggerTopNavMethod();
            }, 500);

            // Step 4: Listen for file upload result
            this.adoptSignatureService.fileUploadStatus$
              .pipe(first())
              .subscribe((status) => {
                if (status.success) {
                  this.successMessage =
                    '✅ Issue created and file uploaded successfully!';
                    
                    setTimeout(() => {
                      this.issueTitle = '';
                      this.tempIssueTitle = "";
                      this.issueDescription = "";
                      this.isActive = false;
                    this.isLoading = false;
                    this.closeCreateIssueModal();
                    this.successMessage = '';
                  }, 2000);
                } else {
                  this.isLoading = false;
                  this.errorMessage = '❌ Failed to upload the file!';
                }
              });
          })
          .catch((error) => {
            console.error('❌ Issue creation failed:', error);
            this.isLoading = false;
            this.errorMessage = '❌ Issue creation failed!';
          });
      });
    });
  }

  // Create Issue and return the Issue ID
  createIssue(data): Promise<string> {
    // Return issueId
    return new Promise((resolve, reject) => {
      const headers = new HttpHeaders();
      this.http
        .post<{ data: { id: string } }>(
          `${NEST_URL}/api/v1/issue/create`,
          data,
          { headers }
        )
        .subscribe({
          next: (response) => {
            console.log('Issue created successfully:', response?.data?.id);
            resolve(response?.data?.id); // ✅ Return the issueId
          },
          error: (error) => {
            console.error('Error creating issue:', error);
            reject(error);
          },
        });
    });
  }

  resetForm(): void {
    this.issueTitle = '';
    this.issueDescription = '';
    this.issueStatus = 'To Do';
    this.issueStartDate = '';
    this.issueEndDate = '';
    this.issueFiles = [];
    this.issueProjectId = '';
  }

  onAction(undo: boolean) {
    if (undo) RXCore.markUpUndo();
    else RXCore.markUpRedo();
  }
  /*calibrate(selected) {

    RXCore.onGuiCalibratediag(onCalibrateFinished);

    let rxCoreSvc = this.rxCoreService;

    function onCalibrateFinished(data) {
      console.log("data app", data);
        //$rootScope.$broadcast(RXCORE_EVENTS.CALIBRATE_FINISHED, data);
        rxCoreSvc.setCalibrateFinished(true, data)
    }

    RXCore.calibrate(selected);
  }*/
}
