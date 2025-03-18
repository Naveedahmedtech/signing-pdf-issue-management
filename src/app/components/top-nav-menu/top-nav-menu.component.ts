import { Component, OnInit, ViewChild, ElementRef, Input } from '@angular/core';
import { FileGaleryService } from '../file-galery/file-galery.service';
import { RxCoreService } from 'src/app/services/rxcore.service';
import { RXCore } from 'src/rxcore';
import { AnnotationToolsService } from '../annotation-tools/annotation-tools.service';
import { PrintService } from '../print/print.service';
import { IGuiConfig } from 'src/rxcore/models/IGuiConfig';
import { CompareService } from '../compare/compare.service';
import { TopNavMenuService } from './top-nav-menu.service';
import { GuiMode } from 'src/rxcore/enums/GuiMode';
import { combineLatest, first, Subscription } from 'rxjs';
import { SideNavMenuService } from '../side-nav-menu/side-nav-menu.service';
import { MeasurePanelService } from '../annotation-tools/measure-panel/measure-panel.service';
import { ActionType } from './type';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { NEST_URL } from 'src/app/constants';
import { AdoptSignatureService } from '../signature/adopt-signature/adopt-signature.service';


@Component({
  selector: 'top-nav-menu',
  templateUrl: './top-nav-menu.component.html',
  styleUrls: ['./top-nav-menu.component.scss'],
  host: {
    '(document:click)': 'handleClickOutside($event)',
    '(document:keydown)': 'handleKeyboardEvents($event)',
    '(window:keydown.control.p)': 'handlePrint($event)'
  }
})
export class TopNavMenuComponent implements OnInit {
  @ViewChild('sidebar') sidebar: ElementRef;
  @ViewChild('burger') burger: ElementRef;
  @ViewChild('more') more: ElementRef;
  @Input() state: any;;

  guiConfig$ = this.rxCoreService.guiConfig$;
  guiState$ = this.rxCoreService.guiState$;
  guiMode$ = this.rxCoreService.guiMode$;
  GuiMode = GuiMode;
  guiConfig: IGuiConfig = {};
  guiState: any;
  guiMode: any;
  moreOpened: boolean = false;
  burgerOpened: boolean = false;
  sidebarOpened: boolean = false;
  modalFileGaleryOpened$ = this.fileGaleryService.modalOpened$;
  isPrint: boolean = false;
  isPDF : boolean = false;
  fileInfo: any = {};
  selectedValue: any;
  options: Array<{ value: GuiMode, label: string, hidden?: boolean }> = [];
  canChangeSign: boolean = false;
  disableImages: boolean = false;
  containLayers: boolean = false;
  containBlocks: boolean = false;
  isActionSelected: boolean = false;
  actionType: ActionType = "None";
  private guiOnNoteSelected: Subscription;
  currentScaleValue: string;
  fileLength: number = 0;
  
  constructor(
    private readonly fileGaleryService: FileGaleryService,
    private readonly rxCoreService: RxCoreService,
    private readonly annotationToolsService: AnnotationToolsService,
    private readonly printService: PrintService,
    private readonly compareService: CompareService,
    private readonly service: TopNavMenuService,
    private readonly sideNavMenuService: SideNavMenuService,
    private readonly measurePanelService: MeasurePanelService,
    private http: HttpClient,
    private readonly adoptSignatureService: AdoptSignatureService,
    ) {
  }

  

  private _setOptions(option: any = undefined): void {
    this.options = [
      { value: GuiMode.View, label: "View" },
      { value: GuiMode.Annotate, label: "Annotate", hidden: !this.guiConfig.canAnnotate },
      { value: GuiMode.Measure, label: "Measure", hidden: !this.guiConfig.canAnnotate },
      { value: GuiMode.Signature, label: "Signature", hidden: !(this.guiConfig.canSignature && this.canChangeSign) },
      { value: GuiMode.Compare, label: "Revision", hidden: !this.guiConfig.canCompare || !this.compareService.isComparisonActive }
    ];

    this.selectedValue = this.options[3];
    this.annotationToolsService.setSelectedOption(this.selectedValue);
  }

  ngOnInit(): void {
    this._setOptions();
    this.adoptSignatureService.topNavMethodTrigger$.subscribe(() => {
      this.onGetURL()
        .then(() => {
          // Do something after success
          this.adoptSignatureService.notifyFileUploadStatus(true, "File uploaded successfully!");
        })
        .catch((error) => {
          console.error("Failed:", error);
          // Handle error case
          this.adoptSignatureService.notifyFileUploadStatus(false, "File upload failed: " + error);
        });
    });
    this.rxCoreService.guiState$.subscribe((state) => {
      this.guiState = state;
      this.canChangeSign = state.numpages && state.isPDF && RXCore.getCanChangeSign();
      this._setOptions();

      this.isPDF = state.isPDF;

      if (this.compareService.isComparisonActive) {
        // const value = this.options.find(option => option.value == "compare");
        const value = this.options[3]
        if (value) {
          this.onModeChange(value, false);
        }
      }
    });

    this.rxCoreService.guiMode$.subscribe(mode => {
      this.guiMode = mode;
      // const value = this.options.find(option => option.value == mode);
      const value = this.options[3]

      if (value) {
        this.onModeChange(value, true);
      }
    });

    this.rxCoreService.guiConfig$.subscribe(config => {
      this.guiConfig = config;
      this._setOptions(this.selectedValue);
    });

    this.service.openModalPrint$.subscribe(() => {
      this.isPrint = true;
    });

    this.rxCoreService.guiVectorLayers$.subscribe((layers) => {
      this.containLayers = layers.length > 0;
    });

    this.rxCoreService.guiVectorBlocks$.subscribe((blocks) => {
      this.containBlocks = blocks.length > 0;
    });

    this.service.activeFile$.subscribe(file => {
    })

    this.guiOnNoteSelected = this.rxCoreService.guiOnCommentSelect$.subscribe((value: boolean) => {

      if (value !== undefined){
        this.isActionSelected = value;
      }
     
    });

    this.annotationToolsService.notePanelState$.subscribe(state => {
      if(state?.markupnumber !== undefined)
      this.isActionSelected = state?.markupnumber;
    });

    this.measurePanelService.measureScaleState$.subscribe((state) => {
      if(state.visible && state.value) {
        this.currentScaleValue = state.value;
      }
      
      if(state.visible === false) {
        this.currentScaleValue = '';
      }
    });

    this.service.fileLength$.subscribe(length => {
      this.fileLength = length;
    });


  }

  /* Listeners */
  handleClickOutside(event: any) {
    if (this.moreOpened && !this.more.nativeElement.contains(event.target)) {
      this.moreOpened = false;
    }

    if (this.burgerOpened && !this.burger.nativeElement.contains(event.target)) {
      this.burgerOpened = false;
    }

    if (this.sidebarOpened && !this.sidebar.nativeElement.contains(event.target)) {
      this.sidebarOpened = false;
    }
  }

  handleKeyboardEvents($event: KeyboardEvent) {
    if (this.moreOpened || this.burgerOpened || this.sidebarOpened) {
      $event.preventDefault();
    } else {
      return;
    }

    if ($event.code === 'Escape') {
      this.moreOpened = this.burgerOpened = this.sidebarOpened = false;
    }
  }

  handlePrint(event: KeyboardEvent) {
    event.preventDefault();
    this.openModalPrint();
  }
  /* End listeners */

  handleOpenFile() {
    this.fileGaleryService.openModal();
    this.burgerOpened = false;
  }

  handleCloseModalFileGalery() {
    this.fileGaleryService.closeModal();
  }

  handleFileSelect(item: any) {
    RXCore.openFile(`${RXCore.Config.baseFileURL}${item.file}`);
  }

  handleOnFileUpload() {
    RXCore.fileSelected();
  }

  onModeChange(option: any, broadcast: boolean = true) {
    this.selectedValue = this.options[3];
    this.annotationToolsService.setSelectedOption(option);

    if (this.options[3].value === 'annotate' || this.options[3].value === 'compare' || this.options[3].value === 'measure') {
      if (this.options[3].value === 'compare') {
        this.rxCoreService.setGuiConfig({
          canSignature: true,
          canAnnotate: true,
          canSaveFile: false,
          canExport: false,
          canPrint: false,
          canGetFileInfo: false,
          disableBurgerMenuCompare: true,
          disableBirdEyeButton: true,
          disableRotateButton: true,
          disableSelectTextButton: true,
          disableSearchTextButton: true,
          disableSearchAttributesButton: true,
          disableMarkupTextButton: true,
          disableMarkupCalloutButton: true,
          disableMarkupStampButton: true,
          disableMarkupPaintButton: true,
          disableMarkupArrowButton: true,
          disableMarkupMeasureButton: true,
          disableMarkupCountButton: true,
          disableMarkupEraseButton: true,
          disableMarkupNoteButton: true,
          disableMarkupLockButton: true,
          disableMarkupShapeRectangleButton: true,
          disableMarkupShapeEllipseButton: true,
          disableMarkupShapeRoundedRectangleButton: true,
          disableMarkupShapePolygonButton: true,
          enableGrayscaleButton: this.compareService.isComparisonActive,
          disableImages: true,
          disableSignature: true,
          disableLinks: true,
          disableSymbol: true,

        });
      } else {


        if (this.compareService.isComparisonActive) {
          this.rxCoreService.setGuiConfig({
            canCompare: true,
            canSignature: false,
            canAnnotate: true,
            canSaveFile: false,
            canExport: false,
            canPrint: false,
            canGetFileInfo: false,
            disableBurgerMenuCompare: true,
            disableBirdEyeButton: false,
            disableRotateButton: false,
            disableSelectTextButton: false,
            disableSearchTextButton: false,
            disableSearchAttributesButton: false,
            disableMarkupTextButton: false,
            disableMarkupCalloutButton: false,
            disableMarkupStampButton: false,
            disableMarkupPaintButton: false,
            disableMarkupArrowButton: false,
            disableMarkupMeasureButton: false,
            disableMarkupCountButton: false,
            disableMarkupEraseButton: false,
            disableMarkupNoteButton: false,
            disableMarkupLockButton: false,
            disableMarkupShapeRectangleButton: false,
            disableMarkupShapeEllipseButton: false,
            disableMarkupShapeRoundedRectangleButton: false,
            disableMarkupShapePolygonButton: false,
            enableGrayscaleButton: this.compareService.isComparisonActive,
            disableImages: true,
            disableSignature: true,
            disableLinks: true,
            disableSymbol: true,

          });
        } else {

          if (this.options[3].value === 'measure') {
            this.rxCoreService.setGuiConfig({
              disableMarkupTextButton: true,
              disableMarkupCalloutButton: true,
              disableMarkupEraseButton: true,
              disableMarkupNoteButton: true,
              //disableMarkupShapeRectangleButton: true,
              //disableMarkupShapeEllipseButton: true,
              //disableMarkupShapeRoundedRectangleButton: true,
              //disableMarkupShapePolygonButton: true,
              disableMarkupShapeButton : true,
              disableMarkupStampButton: true,
              disableMarkupPaintButton: true,
              disableMarkupArrowButton: true,
              disableMarkupCountButton: false,
              disableMarkupMeasureButton: false,
              disableImages: true,
              disableSignature: true,
              disableLinks: true,
              disableSymbol: true,

            });
            const docObj = RXCore.printDoc();
            if(docObj && docObj.scalesOptions && docObj.scalesOptions.length === 0) 
              this.annotationToolsService.setMeasurePanelState({ visible: true }); 
            
  
          } else if(this.options[3].value === 'annotate'){
            this.rxCoreService.setGuiConfig({
              disableMarkupTextButton: false,
              disableMarkupCalloutButton: false,
              disableMarkupEraseButton: false,
              disableMarkupNoteButton: false,
              //disableMarkupShapeRectangleButton: false,
              //disableMarkupShapeEllipseButton: false,
              //disableMarkupShapeRoundedRectangleButton: false,
              //disableMarkupShapePolygonButton: false,
              disableMarkupShapeButton : false,
              disableMarkupStampButton: false,
              disableMarkupPaintButton: false,
              disableMarkupArrowButton: false,
              disableMarkupCountButton: true,
              disableMarkupMeasureButton: true,
              disableImages: false, 
              disableLinks: false,
              disableSymbol: false,

            });

          }else{
            this.rxCoreService.resetGuiConfig();
          }
  

          
        }
      }

      this.annotationToolsService.show();
    } else {
      this.annotationToolsService.hide();
    }

    this.annotationToolsService.setNotePanelState({
      visible: this.isActionSelected && this.actionType === 'Comment',
      objectType: this.selectedValue.value,
    });


    if (broadcast) {
      this.rxCoreService.setGuiMode(this.options[3].value);
    }
  }

  openModalPrint() {
    this.state?.activefile ? (this.isPrint = true, this.burgerOpened = false) : this.isPrint = false;

    if(this.isPrint){
      document.documentElement.style.setProperty("--body-overflow", "visible");
    }

    //

  }

  

  fileInfoDialog(): void {
    this.burgerOpened = false;
    this.printService.data(false);
    RXCore.fileInfoDialog();
  }

  handleSaveFile(): void {
    RXCore.markUpSave();
    this.burgerOpened = false;
  }

  /* handleGetJSONMarkup():void{
    RXCore.markupGetJSON(false);
    this.burgerOpened = false;
  } */

  openModalCompare(): void {
    if (!this.state?.activefile || this.state?.is3D || this.guiConfig.disableBurgerMenuCompare) return;

    this.compareService.showCreateCompareModal();
    this.burgerOpened = false;
  }

  onExportClick(): void {
    if (this.state?.activefile) {
      this.burgerOpened = false;
      RXCore.exportPDF();
    }
  }

  //uploadPDF

  onPDFUploadClick(): void {
    if (this.state?.activefile) {
      this.burgerOpened = false;
      //RXCore.exportPDF();
      RXCore.uploadPDF();
      //var szURL = "http://myserver.somedomain.com/mypdfhandlingapp?documentid";
      //RXCore.uploadPDFCustom(szURL);

    }
  }



  onPDFDownloadClick():void{
    if (this.state?.activefile) {
      this.burgerOpened = false;

      RXCore.downloadPDF();

      //RXCore.exportPDF();
    }

  }


  onSearchPanelSelect (): void {
    this.onActionSelect("Search")
  }

  onCommentPanelSelect (): void {
    this.onActionSelect("Comment")
  }


  onActionSelect(actionType: ActionType): void {
    
    if(this.actionType.includes(actionType)) {
      this.isActionSelected = !this.isActionSelected
    } else {
      this.actionType = actionType;
      this.isActionSelected = true
    }

    console.log(actionType, this.isActionSelected)

    if(actionType === "Comment"){
      this.annotationToolsService.setSearchPanelState({ visible: false });
      this.annotationToolsService.setNotePanelState({ visible: this.isActionSelected && actionType === "Comment" });
    }

    if(actionType === "Search"){
      this.annotationToolsService.setNotePanelState({ visible: false });
      this.annotationToolsService.setSearchPanelState({ visible: this.isActionSelected && actionType === "Search" });
    }

    
    

    setTimeout(() => {
      //RXCore.doResize(false, 0, 0);      
    }, 100);
    
  }


  /* onActionSelect(): void {

    if (this.isActionSelected) {
      this.isActionSelected = false;
      this.annotationToolsService.setNotePanelState({ visible: false });

    }else{
      this.isActionSelected = true;
      this.rxCoreService.setCommentSelected(this.isActionSelected);
      this.annotationToolsService.setNotePanelState({ visible: this.isActionSelected });

    }

    //this.isActionSelected = true;
    //this.rxCoreService.setCommentSelected(this.isActionSelected);
    //this.annotationToolsService.setNotePanelState({ visible: this.isActionSelected });


    setTimeout(() => {
      //RXCore.doResize(false, 0, 0);      
    }, 100);
    
  } */


  handleOpenSidebarMenu() {
    const visibleItems = [
      { index: 0, visible: !(this.guiConfig?.disableViewPages) },
      { index: 5, visible: (this.guiConfig?.canSignature) && this.canChangeSign && this.guiMode == GuiMode.Signature },
      { index: 3, visible: !(this.guiConfig?.disableViewVectorLayers) && (this.guiState?.is2D || this.guiState?.isPDF) && this.containLayers },
      { index: 6, visible: !(this.guiConfig?.disableViewVectorLayers) && this.guiState?.is2D && this.containBlocks },
      { index: 4, visible: !(this.guiConfig?.disableView3DParts) && this.guiState?.is3D }
    ];

    const visibleCount = visibleItems.filter(option => option.visible).length;

    if (visibleCount > 1) {
      this.sidebarOpened = !this.sidebarOpened;
    } else if (visibleCount === 1) {
      const indexToOpen = visibleItems.find(item => item.visible);
      this.handleSidebarOpen(indexToOpen?.index || 0);
    }
  }

  handleSidebarOpen(index: number): void {
    this.sideNavMenuService.toggleSidebar(index);
    this.sidebarOpened = false;
  }
  
  ngOnDestroy(): void {
    this.guiOnNoteSelected.unsubscribe();
  }



  onGetURL(): Promise<void> {
    return new Promise((resolve, reject) => {
      // 🔄 Wait until active file is available
      if (!this.state?.activefile) {
        console.error("⚠️ No active file available. Retrying in 500ms...");
        setTimeout(() => this.onGetURL().then(resolve).catch(reject), 500);
        return;
      }

      this.burgerOpened = false;

      RXCore.getPdfUrl()
        .then((url) => {
          return fetch(url)
            .then((response) => {
              if (!response.ok) {
                throw new Error("Failed to fetch the file from the provided URL.");
              }
              return response.blob(); // Convert response to Blob
            })
            .then((blob) => {
              // Fetch all necessary values at once using `combineLatest`
              combineLatest([
                this.adoptSignatureService.filePath$.pipe(first()),
                this.adoptSignatureService.fileId$.pipe(first()),
                this.adoptSignatureService.userId$.pipe(first()),
                this.adoptSignatureService.issueId$.pipe(first()),
              ]).subscribe(([filePath, fileId, userId, issueId]) => {

                if (!filePath || !fileId || !userId || !issueId) {
                  reject("Missing required data (filePath, fileId, issueId, or userId).");
                  return;
                }

                // Define the file name
                const fileName = filePath.split("/").pop() || "annotation.pdf";

                // Upload and handle success/error
                this.uploadToServer(blob, fileName, fileId, userId, issueId)
                  .then(() => {
                    resolve(); // ✅ Success
                  })
                  .catch((error) => {
                    console.error("❌ Upload failed:", error);
                    reject(error); // ❌ Failure
                  });
              });
            });
        })
        .catch((error) => {
          console.error("❌ Error fetching PDF URL:", error);
          reject(error);
        });
    });
  }

  uploadToServer(file: Blob, fileName: string = "hello.pdf", fileId: string, userId: string, issueId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append("files", file, fileName);

      const headers = new HttpHeaders(); // Add any headers if needed (e.g., Authorization)

      this.http
        .put(
          `${NEST_URL}/api/v1/universal/upload/${fileId}?userId=${userId}&issueId=${issueId}`,
          formData,
          { headers }
        )
        .subscribe({
          next: (response) => {
            resolve(); // ✅ Success
          },
          error: (error) => {
            console.error("Error uploading file:", error);
            reject(error); // ❌ Failure
          },
        });
    });
  }

}
