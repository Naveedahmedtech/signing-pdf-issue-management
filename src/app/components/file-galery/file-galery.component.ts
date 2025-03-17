import {
  Component,
  OnInit,
  Output,
  EventEmitter,
  ViewChild,
  ElementRef,
  Input,
  ChangeDetectorRef,
} from '@angular/core';
import { RxCoreService } from '../../services/rxcore.service';
import { RXCore } from 'src/rxcore';
import { FileGaleryService } from './file-galery.service';
import { random } from 'lodash-es';
import { IGuiConfig } from 'src/rxcore/models/IGuiConfig';
import { AdoptSignatureService } from '../signature/adopt-signature/adopt-signature.service';
import { NEST_URL } from 'src/app/constants';

@Component({
  selector: 'rx-file-galery',
  templateUrl: './file-galery.component.html',
  styleUrls: ['./file-galery.component.scss'],
})
export class FileGaleryComponent implements OnInit {
  // @ViewChild('fileToUpload') fileToUpload: ElementRef;
  @ViewChild('fileToUpload', { static: false }) fileToUpload!: any;

  @ViewChild('progressBar') progressBar: ElementRef;
  @Output() onSelect = new EventEmitter<any>();
  @Output() onUpload = new EventEmitter<void>();
  @Input() filePath: string | null = null;

  cacheUrl = RXCore.Config.xmlurlrel + '/cache/';

  groups = [
    {
      name: 'CAD Drawings',
      items: [
        {
          id: 'CAD_AUTOCAD',
          name: 'AutoCAD Drawing',
          file: 'demo1.dwg',
          type: '2D',
          size: 106,
          thumbnail: this.cacheUrl + 'demo1-1aaac-468d814f/1_1T.PNG',
        },
        {
          id: 'CAD_MIROSTATION',
          name: 'Microstation Drawing',
          file: 'demo5.dgn',
          type: '2D',
          size: 5706,
        },
        //{"id": "CAD_SOLIDWORKS", "name": "SolidWorks Drawing", "file": "Sprinkler.SLDDRW", "type": "2D", "size": 3127},
        //{"id": "CAD_COMPARE", "name": "Compare", "action": "compare", "file": ["RXHDEMO5.dwg","Rxhdemo6.dwg"], "type": "2D"}
      ],
    },
    {
      name: '3D Models',
      items: [
        {
          id: 'C3D_IFCMODEL',
          name: 'IFC model',
          file: 'AC11-FZK-Haus-IFC.ifc',
          type: '3D',
          size: 4048,
        },
        {
          id: 'C3D_KARLSRUHE',
          name: 'Karlsruhe institue',
          file: 'AC11-Institute-Var-2-IFC.ifc',
          type: '3D',
          size: 2769,
        },
        {
          id: 'C3D_HITO',
          name: 'HITO School building',
          file: 'Plan_20070203_2x3.ifc',
          type: '3D',
          size: 72915,
        },
      ],
    },
    {
      name: 'Plotter Files',
      items: [
        {
          id: 'PLOTTER_HPGL',
          name: 'HPGL Plot File',
          file: 'demo2.plt',
          type: '2D',
          size: 38,
        },
        {
          id: 'PLOTTER_GERBER',
          name: 'Gerber File',
          file: 'demo.gbr',
          type: '2D',
          size: 62,
        },
      ],
    },
    {
      name: 'Image Files',
      items: [
        {
          id: 'IMAGE_TIFF',
          name: 'Color Tiff',
          file: 'demo6.tif',
          type: '2D',
          size: 193,
        },
        {
          id: 'IMAGE_TIFF_MONO',
          name: 'Mono Tiff',
          file: 'demo7.tif',
          type: '2D',
          size: 396,
        },
        {
          id: 'IMAGE_MULTIPAGE',
          name: 'Multipage Tiff',
          file: 'demo8.tif',
          type: '2D',
          size: 870,
        },
        {
          id: 'IMAGE_JPEG',
          name: 'Jpeg',
          file: 'X-35.jpg',
          type: '2D',
          size: 714,
        },
      ],
    },
    {
      name: 'Office Documents',
      items: [
        //{"id": "OFFICE_EXCEL", "name": "Excel Spreadsheet", "file": "demo11.xlsx", "type": "2D"},
        {
          id: 'OFFICE_PDF',
          name: 'PDF Document',
          file: '040915 MOBSLAKT.pdf',
          type: 'PDF',
          size: 125,
        },
        {
          id: 'RXVIEW360_API_REFERENCE',
          name: 'API reference',
          file: 'RxView360_API_Specification.pdf',
          type: 'PDF',
          size: 1727,
        },
        {
          id: 'demo9',
          name: 'Sign demo',
          file: 'demo9.pdf',
          type: 'PDF',
          size: 68,
        },
      ],
    },
  ];

  guiConfig$ = this.rxCoreService.guiConfig$;
  guiConfig: IGuiConfig | undefined;
  canCollaborate: boolean | undefined = false;

  selected = this.groups[0];
  leftTabActiveIndex: number = 0;
  selectedFileName: string;
  fileSize: number = 0;
  fileSizeUnits: string;
  file: any;
  isUploadFile: boolean = false;
  fileType: string;
  isUploading: boolean = false;

  constructor(
    private readonly fileGaleryService: FileGaleryService,
    private readonly rxCoreService: RxCoreService,
    private readonly adoptSignatureService: AdoptSignatureService,
    private cdr: ChangeDetectorRef,
  ) {}

  //constructor(private readonly fileGaleryService: FileGaleryService) { }
  ngAfterViewInit() {
    setTimeout(() => {
      const fileInput = document.querySelector('#fileToUpload') as HTMLInputElement;
      if (!fileInput) {
        console.error('File input still not found after querySelector ngAfterViewInit');
      } else {
        console.log('File input found using querySelector: ngAfterViewInit', this.fileToUpload);
      }
    }, 500);
  }
  
  
  ngOnInit() {
    this.leftTabActiveIndex = 1;
    this.adoptSignatureService.filePath$.subscribe((filePath) => {
      // console.log('File path in TopNavMenu:', filePath);
      console.log("FILE TO UPLOAD HTML: ", this.fileToUpload)
      if (filePath) {
        this.loadFileById(filePath);
      }
    });
    this.fileGaleryService.getStatusActiveDocument().subscribe((status) => {
      if (status === 'awaitingSetActiveDocument' && this.progressBar)
        this.progressBar.nativeElement.value = 100;
      else {
        this.clearData();
        this.leftTabActiveIndex = 1;
      }
    });

    this.guiConfig$.subscribe((config) => {
      this.guiConfig = config;
      this.canCollaborate = this.guiConfig.canCollaborate;
    });

    // If we can find the roomName in the URL, we will create a collabService
    // There maybe a better way to open a file, we may refactor this later
    const parameters = new URLSearchParams(window.location.search);
    const roomName = parameters.get('roomName');
    if (this.canCollaborate && roomName) {
      // don't know why we need to wait for a while, there is console error if we call directly
      setTimeout(() => {
        this.handleFileSelect(this.groups[0].items[0]);
      }, 1000);
    }
  }


  loadFileById(filePath: string) {
    // console.log('Loading file with filepath:', filePath);
    const customFile = {
      id: 'test-id',
      name: filePath, // File URL
      size: 5242880, // 5 MB
      type: 'application/pdf',
    };
    this.testCustomFile(customFile);
    // Implement logic to load the file based on the ID
  }

  normalizeFile(customFile: any): Promise<File> {
    const { name, type, size } = customFile;
    // console.log('Normalizing file', customFile);
    // Extract the file name from the URL if `name` is a URL
    const fileName = name.split('/').pop() || 'unknown-file';

    return new Promise((resolve, reject) => {
      // Fetch the file content from the URL
      fetch(`${NEST_URL}/${name}`)
        .then((response) => {
          if (!response.ok) {
            throw new Error(`Failed to fetch file: ${response.statusText}`);
          }
          return response.blob(); // Get the file content as a Blob
        })
        .then((blob) => {
          // Create a File object from the Blob
          const file = new File([blob], fileName, {
            type,
            lastModified: Date.now(),
          });
          resolve(file);
        })
        .catch((error) => {
          console.error('Error normalizing file:', error);
          reject(error);
        });
    });
  }

  // testCustomFile(customFile: any): void {
  //   if (this.isUploading) {
  //     console.warn('Upload already in progress...');
  //     return;
  //   }

  //   this.normalizeFile(customFile)
  //     .then((file) => {
  //       if (!file || !file.size) {
  //         console.error('Invalid file detected:', file);
  //         return;
  //       }

  //       this.handleFileUpload(null, file);

  //       // Create DataTransfer to simulate file input
  //       const dataTransfer = new DataTransfer();
  //       dataTransfer.items.add(file);

  //       // const fileInput = document.getElementById('fileToUpload') as HTMLInputElement;
  //       const fileInput = this.fileToUpload;

  //       if (fileInput) {
  //         fileInput.files = dataTransfer.files;

  //         setTimeout(() => {
  //           const changeEvent = new Event('change', { bubbles: true });
  //           fileInput.dispatchEvent(changeEvent);

  //           setTimeout(() => {
  //             if (fileInput.files && fileInput.files.length > 0) {
  //               console.log("File registered:", fileInput.files[0]);

  //               // **Retry mechanism to find the upload button**
  //               const waitForButton = setInterval(() => {
  //                 const uploadButton = document.getElementById('uploadButton') as HTMLButtonElement;
  //                 if (uploadButton) {
  //                   clearInterval(waitForButton); // Stop retrying once found
  //                   uploadButton.click();
  //                   console.log("Upload button clicked programmatically");
  //                 } else {
  //                   console.warn("Upload button not found yet, retrying...");
  //                 }
  //               }, 100); // Check every 100ms until the button is found

  //               setTimeout(() => {
  //                 clearInterval(waitForButton); // Stop trying after 3 seconds
  //                 console.error("Upload button was not found in time.");
  //               }, 3000);
  //             } else {
  //               console.error("File input did not register the file correctly.");
  //             }
  //           }, 100);
  //         }, 200);
  //       } else {
  //         console.error("File input element not found");
  //       }
  //     })
  //     .catch((error) => {
  //       console.error("Error handling custom file:", error);
  //     });
  // }

  testCustomFile(customFile: any): void {
    if (this.isUploading) {
      console.warn('Upload already in progress...');
      return;
    }
  
    this.normalizeFile(customFile)
      .then((file) => {
        if (!file || !file.size) {
          console.error('Invalid file detected:', file);
          return;
        }
  
        // Create DataTransfer to simulate file input
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);

        this.handleFileUpload(null, file);
  
        // ✅ Ensure file input is available before accessing
        setTimeout(() => {
          const fileInput = document.querySelector('#fileToUpload') as HTMLInputElement;
  
          if (fileInput) {
            console.log("FILE FOUND!!!!--->>>>>>")
            fileInput.files = dataTransfer.files; // ✅ Assign file
            
            setTimeout(() => {
              const changeEvent = new Event('change', { bubbles: true });
              fileInput.dispatchEvent(changeEvent); // ✅ Trigger change event
  
              setTimeout(() => {
                if (fileInput.files && fileInput.files.length > 0) {
                  console.log('File registered:', fileInput.files[0]);
  
                  // ✅ Retry mechanism to find the upload button
                  const waitForButton = setInterval(() => {
                    const uploadButton = document.getElementById('uploadButton') as HTMLButtonElement;
                    if (uploadButton) {
                      clearInterval(waitForButton); // ✅ Stop retrying once found
                      uploadButton.click();
                      console.log('Upload button clicked programmatically');
                    } else {
                      console.warn('Upload button not found yet, retrying...');
                    }
                  }, 100); // ✅ Check every 100ms
  
                  setTimeout(() => {
                    clearInterval(waitForButton); // ✅ Stop trying after 3 seconds
                    console.error('Upload button was not found in time.');
                  }, 3000);
                } else {
                  console.error('File input did not register the file correctly.');
                }
              }, 100);
            }, 200);
          } else {
            console.error('File input element not found after timeout.');
          }
        }, 500); // ✅ Wait for DOM update
      })
      .catch((error) => {
        console.error('Error handling custom file:', error);
      });
  }
  

  private isProgrammaticChange: boolean = false; // Add this to your component

  handleFileSelect(item): void {
    this.uploadFile(item);
    this.fileType = item.type;
    this.onSelect.emit(item);
  }

  handleFileUpload(event?: any, customFile?: any): void {
    if (this.isProgrammaticChange) {
      this.isProgrammaticChange = false; // Reset flag to allow future changes
      return; // Prevent recursive call
    }

    const file =
      customFile ?? (event?.target ? event.target.files[0] : event?.[0]);

    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);

    const fileInput = document.getElementById(
      'fileToUpload'
    ) as HTMLInputElement;

    if (fileInput) {
      // console.log('Coming in file input', { dataTransfer: dataTransfer.files });
      fileInput.files = dataTransfer.files;

      // Set flag before triggering change event
      this.isProgrammaticChange = true;
      const changeEvent = new Event('change', { bubbles: true });
      fileInput.dispatchEvent(changeEvent);
    } else {
      console.error('File input element not found');
    }

    if (file) {
      this.file = file;
      this.selectedFileName = file.name;

      const bytes = file.size;
      if (bytes < 1024) {
        this.fileSize = parseFloat(bytes.toFixed(2));
        this.fileSizeUnits = 'B';
      } else if (bytes < 1024 * 1024) {
        this.fileSize = parseFloat((bytes / 1024).toFixed(2));
        this.fileSizeUnits = 'KB';
      } else if (bytes < 1024 * 1024 * 1024) {
        this.fileSize = parseFloat((bytes / (1024 * 1024)).toFixed(2));
        this.fileSizeUnits = 'MB';
      } else {
        this.fileSize = parseFloat((bytes / (1024 * 1024 * 1024)).toFixed(2));
        this.fileSizeUnits = 'GB';
      }

      // // console.log('File uploaded:', this.file);
    }
  }

  onSelectRecentFile(file) {
    const newFile = {
      id: Math.ceil(random() * 10000),
      name: file.name,
      file: file.name,
      type: 'PDF',
      size: 1024,
    };
    this.uploadFile(newFile);
    this.fileType = newFile.type;
    this.onSelect.emit(newFile);
  }

  uploadFile(fileSelect?: any): void {
    // Ensure that either `this.file` or `fileSelect` is defined and valid
    const file = this.file || fileSelect;

    if (!file || !file.type) {
      console.error('Invalid file or file type is missing:', file);
      return; // Exit early if the file or type is invalid
    }

    this.isUploadFile = true;

    const fileSize = file.size;
    if (fileSize <= 0) {
      console.error('File size is invalid or 0. Cannot proceed with upload.');
      return;
    }

    const chunkSize = 1024 * 1024; // 1 MB
    const totalChunks = Math.ceil(fileSize / chunkSize);
    let currentChunk = 0;

    const reader = new FileReader();

    reader.onload = () => {
      currentChunk++;

      const progressBar = this.progressBar?.nativeElement;
      const increment = 1;
      const intervalDelay = 20;
      const finalValue = (currentChunk / totalChunks) * 95;

      let currentValue = 0;

      const interval = setInterval(() => {
        currentValue += increment;
        if (progressBar) progressBar.value = currentValue;

        if (currentValue >= finalValue) {
          clearInterval(interval);
        }
      }, intervalDelay);

      if (currentChunk < totalChunks) loadNextChunk();
    };

    const loadNextChunk = () => {
      const start = currentChunk * chunkSize;
      const end = Math.min(start + chunkSize, fileSize);

      // Safely access the `slice` method of the file
      const blob = file.slice ? file.slice(start, end) : null;
      if (blob) {
        reader.readAsBinaryString(blob);
      } else {
        console.error('Failed to slice the file:', file);
      }
    };

    loadNextChunk();

    this.fileGaleryService.sendEventUploadFile();
    // console.log('Uploaded file:', file);

    if (file) {
      this.onUpload.emit();
    }
  }

  clearData() {
    this.file = undefined;
    this.selectedFileName = '';
    this.isUploadFile = false;
    if (this.progressBar) this.progressBar.nativeElement.value = 0;
  }

  handleCloseModalFileGalery() {
    this.fileGaleryService.closeModal();
    if (this.selectedFileName) this.clearData();
  }

  public onDrop(files: FileList): void {
    this.handleFileUpload(files);
    this.fileToUpload.nativeElement.files = files;
  }

  public onChooseClick() {
    this.fileToUpload.nativeElement.click();
  }
}
