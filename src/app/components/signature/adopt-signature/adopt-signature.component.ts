import {
  Component,
  Output,
  EventEmitter,
  OnInit,
  AfterViewInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  HostListener,
  Input,
  ChangeDetectorRef,
} from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { ISignatureData, ISignatures } from 'src/rxcore/models/ISignatures';
import { AdoptSignatureService } from './adopt-signature.service';
import { NEST_URL } from 'src/app/constants';

declare var RxSignLibrary;

@Component({
  selector: 'rx-adopt-signature',
  templateUrl: './adopt-signature.component.html',
  styleUrls: ['./adopt-signature.component.scss'],
})
export class AdoptSignatureComponent
  implements OnInit, AfterViewInit, OnDestroy
{
  @Input() mode: 'create' | 'editSignature' | 'editInitials' = 'create';
  @Output() onCancel: EventEmitter<void> = new EventEmitter<void>();
  @Output() onAdopt: EventEmitter<ISignatures> =
    new EventEmitter<ISignatures>();
  @ViewChild('fileToUpload1') fileToUpload1: ElementRef;
  @ViewChild('fileToUpload2') fileToUpload2: ElementRef;

  rxSignature = RxSignLibrary();
  rxInitials = RxSignLibrary();

  tabActiveIndex: number = 0;
  fullName: string;
  initials: string;
  strokeColor: string = '#000000FF';
  colors = ['#FFFFFFFF', '#0E3BD8FF', '#000000FF', '#F33737FF'];
  thickness: number = 1;
  font: any = { value: 0 };
  fonts = [
    {
      name: 'PrimeraSignature',
      url: 'url(./assets/fonts/PrimeraSignature.ttf)',
      style: { style: 'normal', weight: 700 },
      size: 70,
      id: 'fontstyle_1',
      listSize: '38px',
    },
    {
      name: 'JustSignature',
      url: 'url(./assets/fonts/JustSignature.ttf)',
      style: { style: 'normal', weight: 700 },
      size: 40,
      id: 'fontstyle_2',
      listSize: '16px',
    },
    {
      name: 'AutoSignature',
      url: 'url(./assets/fonts/AAutoSignature.ttf)',
      style: { style: 'normal', weight: 700 },
      size: 70,
      id: 'fontstyle_3',
      listSize: '32px',
    },
  ];
  fontOptions: any = [];

  file1?: any;
  filePreview1?: string;
  bwConversion1: boolean = false;

  file2?: any;
  filePreview2?: string;
  bwConversion2: boolean = false;

  drawBlank = {
    drawsign: '',
    drawinitials: '',
  };

  filePath: string | null = null;
  orderId: string | null = null;
  userId: string | null = null;
  fileId: string | null = null;

  message: string = '';
messageType: 'success' | 'error' | '' = '';
loading: boolean = false; 

  constructor(
    private readonly domSanitizer: DomSanitizer,
    private cdr: ChangeDetectorRef,
    private readonly adoptSignatureService: AdoptSignatureService
  ) {}

  onFullNameChange(): void {
    this.rxSignature.clearcanvas('fontsign');
    this.rxSignature.selectFont(this.font.value);
    this.rxSignature.drawsignName({ value: this.fullName }, 10, 70);

    this.validateFontSignature();
  }

  onInitialsChange(): void {
    this.rxInitials.clearcanvas('fontinitials');
    this.rxInitials.selectFont(this.font.value);
    this.rxInitials.drawsignName({ value: this.initials }, 10, 70);

    this.validateFontInitials();
  }

  clearSignatureCanvas(): void {
    switch (this.tabActiveIndex) {
      case 0:
        this.rxSignature.clearcanvas('drawsign');
        break;
      case 1:
        this.rxSignature.clearcanvas('fontsign');
        break;
      case 2:
        this.file1 = undefined;
        this.filePreview1 = undefined;
        this.rxSignature.clearcanvas('imagesign');
        break;
    }
  }

  clearInitialsCanvas(): void {
    switch (this.tabActiveIndex) {
      case 0:
        this.rxInitials.clearcanvas('drawinitials');
        break;
      case 1:
        this.rxInitials.clearcanvas('fontinitials');
        break;
      case 2:
        this.file2 = undefined;
        this.filePreview2 = undefined;
        this.rxInitials.clearcanvas('imageinitials');
        break;
    }
  }

  ngOnInit(): void {
    this.strokeColor = '#000000FF';
    this.thickness = 1;
    this.fullName = this.initials = '';
    this.fonts.forEach((font, index) => {
      this.rxSignature.addFont(
        font.name,
        font.url,
        font.style,
        font.size,
        font.id,
        font.listSize
      );
      this.rxInitials.addFont(
        font.name,
        font.url,
        font.style,
        font.size,
        font.id,
        font.listSize
      );
      this.fontOptions.push({
        value: index,
        label: this.domSanitizer.bypassSecurityTrustHtml(
          `<span style="font-family: '${font.name}'; font-size: ${font.listSize};">Signature style</span>`
        ),
      });
    });
    this.font = this.fontOptions[0];

    // Subscribe to file data
    this.adoptSignatureService.fileId$.subscribe((id) => (this.fileId = id));
    this.adoptSignatureService.filePath$.subscribe(
      (path) => (this.filePath = path)
    );
    this.adoptSignatureService.orderId$.subscribe(
      (order) => (this.orderId = order)
    );
    this.adoptSignatureService.userId$.subscribe(
      (user) => (this.userId = user)
    );
  }

  ngAfterViewInit(): void {
    this.rxSignature.setCanvasDraw('drawsign');
    this.rxSignature.setCanvasText('fontsign');
    this.rxSignature.initialize();
    this.rxSignature.signFreepen(true);
    this.drawBlank.drawsign = (
      document.getElementById('drawsign') as HTMLCanvasElement
    ).toDataURL();

    this.rxInitials.setCanvasDraw('drawinitials');
    this.rxInitials.setCanvasText('fontinitials');
    this.rxInitials.initialize();
    this.rxInitials.signFreepen(true);
    this.drawBlank.drawinitials = (
      document.getElementById('drawinitials') as HTMLCanvasElement
    ).toDataURL();

    this.cdr.detectChanges();
  }

  ngOnDestroy(): void {
    this.rxSignature.destroy();
    this.rxInitials.destroy();
  }

  onTabSelect(index: number): void {
    this.tabActiveIndex = index;
    switch (this.tabActiveIndex) {
      default:
        this.rxSignature.setCanvasDraw('drawsign');
        this.rxInitials.setCanvasDraw('drawinitials');
        break;
      case 1:
        this.rxSignature.setCanvasText('fontsign');
        this.rxInitials.setCanvasText('fontinitials');
        break;
      case 2:
        this.rxSignature.setCanvasImage('imagesign');
        this.rxInitials.setCanvasImage('imageinitials');
        break;
    }

    this.resetValidation();
  }

  onColorSelect(color: string): void {
    this.strokeColor = color;
    this.clearSignatureCanvas();
    this.rxSignature.setStrokeColor(color);
    this.clearInitialsCanvas();
    this.rxInitials.setStrokeColor(color);

    if (this.fullName) {
      this.onFullNameChange();
    }

    if (this.initials) {
      this.onInitialsChange();
    }
  }

  onThicknessSelect(thickness: number): void {
    this.thickness = thickness;
    this.clearSignatureCanvas();
    this.rxSignature.setLineThickness(thickness);
    this.clearInitialsCanvas();
    this.rxInitials.setLineThickness(thickness);
  }

  onFontSelect(option): void {
    this.font = option;
    this.rxSignature.clearcanvas('fontsign');
    this.rxSignature.selectFont(option.value);
    this.rxInitials.clearcanvas('fontinitials');
    this.rxInitials.selectFont(option.value);

    if (this.fullName) {
      this.onFullNameChange();
    }

    if (this.initials) {
      this.onInitialsChange();
    }
  }

  onCancelClick(): void {
    this.onCancel.emit();
  }

  showMessage(message: string, type: 'success' | 'error') {
    this.message = message;
    this.messageType = type;
  
    // Hide message after 3 seconds
    setTimeout(() => {
      this.message = '';
      this.messageType = '';
    }, 3000);
  }
  

  // getImageData(initials: boolean = false): ISignatureData {
  //   this.loading = true; 
  //   console.log('COMING TO GET THE IMAGE DATA', {
  //     fileId: this.fileId,
  //     orderId: this.orderId,
  //     userId: this.userId,
  //     filePath: this.filePath,
  //   });
  //   const lib = initials ? this.rxInitials : this.rxSignature;

  //   const maxsize = lib.getmaxsizeScaled();

  //   switch (this.tabActiveIndex) {
  //     case 0: {
  //       lib.signFreepen(false);
  //       const signcanv = lib.getDrawSigncanvas();

  //       if (signcanv.height > maxsize.h) {
  //         const cnvscale = maxsize.h / signcanv.height;
  //         const dwnscalecnv = lib.downScaleCanvas(signcanv.cnv, cnvscale);
  //         signcanv.height = signcanv.height * cnvscale;
  //         signcanv.width = signcanv.width * cnvscale;
  //         signcanv.cnv = dwnscalecnv;
  //       }

  //       console.log('----->>>>> 0 case', {
  //         signcanv,
  //         src: signcanv.cnv.toDataURL(),
  //         data: signcanv.cnv,
  //       });

  //       fetch(`${NEST_URL}/api/v1/order/save-signatures`, {
  //         method: 'POST',
  //         headers: {
  //           'Content-Type': 'application/json',
  //         },
  //         body: JSON.stringify({
  //           image: signcanv.cnv.toDataURL(),
  //           orderId: this.orderId || 'a3f8636d-fc27-48a1-af92-91120c706853',
  //           fileId: this.fileId || '58c625cc-d473-4594-af92-29e9b3725f88', 
  //         }),
  //       })
  //         .then((response) => {
  //           if (!response.ok) {
  //             throw new Error(`HTTP error! Status: ${response.status}`);
  //           }
  //           return response.json();
  //         })
  //         .then((data) => {
  //           console.log('Signature uploaded successfully:', data);
  //           this.showMessage('Signature uploaded successfully!', 'success'); // ✅ Show success message
  //         })
  //         .catch((error) => {
  //           console.error('Error uploading signature:', error);
  //           this.showMessage('Failed to upload signature. Please try again.', 'error'); // ✅ Show error message
  //         })
  //         .finally(() => {
  //           this.loading = false; // ✅ Hide loading
  //         });
  
  //       return {
  //         width: 148,
  //         height: 42,
  //         src: signcanv.cnv.toDataURL(),
  //         data: signcanv.cnv,
  //       };
  //     }

  //     case 1: {
  //       const signcanv = lib.getTextSigncanvas();
  //       console.log('----->>>>> 1 case', {
  //         width: signcanv.width,
  //         height: signcanv.height,
  //         src: signcanv.cnv.toDataURL(),
  //         data: signcanv.cnv,
  //       });

  //       return {
  //         width: signcanv.width,
  //         height: signcanv.height,
  //         src: signcanv.cnv.toDataURL(),
  //         data: signcanv.cnv,
  //       };
  //     }

  //     default: {
  //       const imgcanv = lib.getImageSigncanvas(this.bwConversion1);

  //       if (imgcanv.height > maxsize.h) {
  //         const cnvscale = maxsize.h / imgcanv.height;
  //         const dwnscalecnv = this.rxSignature.downScaleCanvas(
  //           imgcanv.cnv,
  //           cnvscale
  //         );
  //         imgcanv.height = imgcanv.height * cnvscale;
  //         imgcanv.width = imgcanv.width * cnvscale;
  //         imgcanv.cnv = dwnscalecnv;
  //       }

  //       if (initials ? this.bwConversion2 : this.bwConversion1) {
  //         const context: any = imgcanv.cnv.getContext('2d');

  //         const imgData = context.getImageData(
  //           0,
  //           0,
  //           imgcanv.width,
  //           imgcanv.height
  //         );
  //         var data = imgData.data;
  //         for (var i = 0; i < data.length; i += 4) {
  //           var constra =
  //             0.34 * data[i] + 0.5 * data[i + 1] + 0.16 * data[i + 2];
  //           data[i] = constra;
  //           data[i + 1] = constra;
  //           data[i + 2] = constra;
  //         }
  //         context.putImageData(imgData, 0, 0);
  //       }
  //       console.log('----->>>>> default case', {
  //         width: imgcanv.width,
  //         height: imgcanv.height,
  //         src: imgcanv.cnv.toDataURL(),
  //         data: imgcanv.cnv,
  //       });
  //       return {
  //         width: imgcanv.width,
  //         height: imgcanv.height,
  //         src: imgcanv.cnv.toDataURL(),
  //         data: imgcanv.cnv,
  //       };
  //     }
  //   }
  // }



  getImageData(initials: boolean = false): Promise<ISignatureData> {
    return new Promise((resolve, reject) => {
      this.loading = true;
  
      console.log('COMING TO GET THE IMAGE DATA', {
        fileId: this.fileId,
        orderId: this.orderId,
        userId: this.userId,
        filePath: this.filePath,
      });
  
      const lib = initials ? this.rxInitials : this.rxSignature;
      const maxsize = lib.getmaxsizeScaled();
      let signcanv;
      let imageData;
  
      switch (this.tabActiveIndex) {
        case 0: // 🎨 Draw Signature Case
          lib.signFreepen(false);
          signcanv = lib.getDrawSigncanvas();
  
          if (signcanv.height > maxsize.h) {
            const cnvscale = maxsize.h / signcanv.height;
            const dwnscalecnv = lib.downScaleCanvas(signcanv.cnv, cnvscale);
            signcanv.height *= cnvscale;
            signcanv.width *= cnvscale;
            signcanv.cnv = dwnscalecnv;
          }
  
          imageData = signcanv.cnv.toDataURL();
          break;
  
        case 1: // 🔤 Text Signature Case
          signcanv = lib.getTextSigncanvas();
          imageData = signcanv.cnv.toDataURL();
          break;
  
        case 2: // 🖼️ Image Signature Case
          signcanv = lib.getImageSigncanvas(this.bwConversion1);
  
          if (signcanv.height > maxsize.h) {
            const cnvscale = maxsize.h / signcanv.height;
            const dwnscalecnv = lib.downScaleCanvas(signcanv.cnv, cnvscale);
            signcanv.height *= cnvscale;
            signcanv.width *= cnvscale;
            signcanv.cnv = dwnscalecnv;
          }
  
          if (initials ? this.bwConversion2 : this.bwConversion1) {
            const context: any = signcanv.cnv.getContext('2d');
            const imgData = context.getImageData(0, 0, signcanv.width, signcanv.height);
            let data = imgData.data;
            for (let i = 0; i < data.length; i += 4) {
              let constra = 0.34 * data[i] + 0.5 * data[i + 1] + 0.16 * data[i + 2];
              data[i] = constra;
              data[i + 1] = constra;
              data[i + 2] = constra;
            }
            context.putImageData(imgData, 0, 0);
          }
  
          imageData = signcanv.cnv.toDataURL();
          break;
  
        default:
          return reject('Invalid tab selection');
      }
  
      console.log(`----->>>>> Case ${this.tabActiveIndex}`, {
        signcanv,
        src: imageData,
        data: signcanv.cnv,
      });
  
      // ✅ Send API request
      fetch(`${NEST_URL}/api/v1/universal/save-signatures`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: imageData,
          // orderId: this.orderId || 'a3f8636d-fc27-48a1-af92-91120c706853',
          // fileId: this.fileId || '58c625cc-d473-4594-af92-29e9b3725f88',
          orderId: this.orderId,
          fileId: this.fileId,
          initials: initials ? 'initials' : 'signature',
        }),
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
          }
          return response.json();
        })
        .then((data) => {
          console.log('Signature uploaded successfully:', data);
          this.showMessage('Signature uploaded successfully!', 'success');
          resolve({
            width: signcanv.width,
            height: signcanv.height,
            src: imageData,
            data: signcanv.cnv,
          });
        })
        .catch((error) => {
          console.error('Error uploading signature:', error);
          this.showMessage('Failed to upload signature. Please try again.', 'error');
          reject(error);
        })
        .finally(() => {
          this.loading = false;
        });
    });
  }
  

  onCreateClick(): void {
    this.validate();
    if (!this.isValid) return;
  
    this.loading = true; // ✅ Show loading while processing
  
    const signaturePromise = this.mode !== 'editInitials' ? this.getImageData() : Promise.resolve(undefined);
    const initialsPromise = this.mode !== 'editSignature' ? this.getImageData(true) : Promise.resolve(undefined);
  
    Promise.all([signaturePromise, initialsPromise])
      .then(([signature, initials]) => {
        this.onAdopt.emit({ signature, initials });
        this.onCancel.emit(); // ✅ Close modal after all API calls succeed
      })
      .catch((error) => {
        console.error('Error while creating signature:', error);
        this.showMessage('Failed to create signature. Please try again.', 'error');
      })
      .finally(() => {
        this.loading = false; // ✅ Hide loading
      });
  }
  


  // onCreateClick(): void {
  //   this.validate();
  //   if (!this.isValid) return;

  //   this.onAdopt.emit({
  //     signature: this.mode !== 'editInitials' ? this.getImageData() : undefined,
  //     initials:
  //       this.mode !== 'editSignature' ? this.getImageData(true) : undefined,
  //   });

  //   this.onCancel.emit();
  // }

  public onDrop1(files: FileList): void {
    this.onFile1Upload(files);
    this.fileToUpload1.nativeElement.files = files;
  }

  public onChoose1Click() {
    this.fileToUpload1.nativeElement.click();
  }

  public onFile1Upload(event) {
    this.file1 = event.target ? event.target.files[0] : event[0];
    this.filePreview1 = URL.createObjectURL(this.file1);
    this.rxSignature.fileSelected({ files: [this.file1] });
    this.validateImageSignature();
  }

  public onBwConversion1Change(): void {
    this.bwConversion1 = !this.bwConversion1;
  }

  public onDrop2(files: FileList): void {
    this.onFile2Upload(files);
    this.fileToUpload2.nativeElement.files = files;
  }

  public onChoose2Click() {
    this.fileToUpload2.nativeElement.click();
  }

  public onFile2Upload(event) {
    this.file2 = event.target ? event.target.files[0] : event[0];
    this.filePreview2 = URL.createObjectURL(this.file2);
    this.rxInitials.fileSelected({ files: [this.file2] });
    this.validateImageInitials();
  }

  public onBwConversion2Change(): void {
    this.bwConversion2 = !this.bwConversion2;
  }

  isCanvasBlank(canvas) {
    const blank = document.createElement('canvas');

    blank.width = canvas.width;
    blank.height = canvas.height;

    return canvas.toDataURL() === blank.toDataURL();
  }

  /* validation */
  isDrawSignatureInValid: boolean = false;
  isDrawInitialsInValid: boolean = false;
  isFontSignatureInValid: boolean = false;
  isFontInitialsInValid: boolean = false;
  isImageSignatureInValid: boolean = false;
  isImageInitialsInValid: boolean = false;

  resetValidation(): void {
    this.isDrawSignatureInValid = false;
    this.isDrawInitialsInValid = false;
    this.isFontSignatureInValid = false;
    this.isFontInitialsInValid = false;
    this.isImageSignatureInValid = false;
    this.isImageInitialsInValid = false;
  }

  get isValid(): boolean {
    return (
      !this.isDrawSignatureInValid &&
      !this.isDrawInitialsInValid &&
      !this.isFontSignatureInValid &&
      !this.isFontInitialsInValid &&
      !this.isImageSignatureInValid &&
      !this.isImageInitialsInValid
    );
  }

  get isDrawSignatureCanvasBlanc(): boolean {
    return (
      (document.getElementById('drawsign') as HTMLCanvasElement)?.toDataURL() ==
      this.drawBlank['drawsign']
    );
  }

  get isDrawInitialsCanvasBlanc(): boolean {
    return (
      (
        document.getElementById('drawinitials') as HTMLCanvasElement
      )?.toDataURL() == this.drawBlank['drawinitials']
    );
  }

  validateDrawSignature(): void {
    if (this.tabActiveIndex !== 0 || this.mode === 'editInitials') {
      this.isDrawSignatureInValid = false;
      return;
    }
    this.isDrawSignatureInValid = this.isDrawSignatureCanvasBlanc;
  }

  validateDrawInitials(): void {
    if (this.tabActiveIndex !== 0 || this.mode === 'editSignature') {
      this.isDrawInitialsInValid = false;
      return;
    }
    this.isDrawInitialsInValid = this.isDrawInitialsCanvasBlanc;
  }

  validateFontSignature(): void {
    if (this.tabActiveIndex !== 1 || this.mode === 'editInitials') {
      this.isFontSignatureInValid = false;
      return;
    }
    this.isFontSignatureInValid = this.fullName?.trim().length == 0;
  }

  validateFontInitials(): void {
    if (this.tabActiveIndex !== 1 || this.mode === 'editSignature') {
      this.isFontInitialsInValid = false;
      return;
    }
    this.isFontInitialsInValid = this.initials?.trim().length == 0;
  }

  validateImageSignature(): void {
    if (this.tabActiveIndex !== 2 || this.mode === 'editInitials') {
      this.isImageSignatureInValid = false;
      return;
    }
    this.isImageSignatureInValid = !this.file1;
  }

  validateImageInitials(): void {
    if (this.tabActiveIndex !== 2 || this.mode === 'editSignature') {
      this.isImageInitialsInValid = false;
      return;
    }
    this.isImageInitialsInValid = !this.file2;
  }

  validate(): void {
    this.validateDrawSignature();
    this.validateDrawInitials();
    this.validateFontSignature();
    this.validateFontInitials();
    this.validateImageSignature();
    this.validateImageInitials();
  }

  @HostListener('document:pointerup', ['$event'])
  onPointerUp(event: PointerEvent | any): void {
    if (event.target.id === 'drawsign') {
      this.validateDrawSignature();
    } else if (event.target.id === 'drawinitials') {
      this.validateDrawInitials();
    }
  }
}
