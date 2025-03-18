import { Injectable } from '@angular/core';
import { BehaviorSubject, ReplaySubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AdoptSignatureService {
  private fileIdSubject = new BehaviorSubject<string | null>(null);
  private filePathSubject = new BehaviorSubject<string | null>(null);
  private orderIdSubject = new BehaviorSubject<string | null>(null);
  private userIdSubject = new BehaviorSubject<string | null>(null);
  private reactSourceSubject = new BehaviorSubject<string | null>(null);
  private projectIdSubject = new BehaviorSubject<string | null>(null);
  private issueIdSource = new BehaviorSubject<string | null>(null);
  // ✅ Use ReplaySubject(1) to ensure new subscribers receive the last emitted value
  private topNavMethodTrigger = new ReplaySubject<void>(1);
  private fileUploadStatus = new ReplaySubject<{ success: boolean; message: string }>(1);
  
  topNavMethodTrigger$ = this.topNavMethodTrigger.asObservable();
  fileUploadStatus$ = this.fileUploadStatus.asObservable();
  issueId$ = this.issueIdSource.asObservable();
  fileId$ = this.fileIdSubject.asObservable();
  filePath$ = this.filePathSubject.asObservable();
  orderId$ = this.orderIdSubject.asObservable();
  userId$ = this.userIdSubject.asObservable();
  reactSource$ = this.reactSourceSubject.asObservable();
  projectId$ = this.projectIdSubject.asObservable();

  setFileId(fileId: string | null) {
    this.fileIdSubject.next(fileId);
  }

  setFilePath(filePath: string | null) {
    this.filePathSubject.next(filePath);
  }

  setOrderId(orderId: string | null) {
    this.orderIdSubject.next(orderId);
  }

  setUserId(userId: string | null) {
    this.userIdSubject.next(userId);
  }

  setReactSource(reactSource: string | null) {
    this.reactSourceSubject.next(reactSource);
  }

  setProjectId(projectId: string | null) {
    this.projectIdSubject.next(projectId);
  }

  getFileId(): string | null {
    return this.fileIdSubject.value;
  }

  getFilePath(): string | null {
    return this.filePathSubject.value;
  }

  getOrderId(): string | null {
    return this.orderIdSubject.value;
  }

  getUserId(): string | null {
    return this.userIdSubject.value;
  }

  getReactSource(): string | null {
    return this.reactSourceSubject.value;
  }

  getProjectId(): string | null {
    return this.projectIdSubject.value;
  }

  /** 🔹 Trigger Top Navigation Method */
  triggerTopNavMethod() {
    this.topNavMethodTrigger.next();
  }

  /** 🔹 Emit Upload Success/Failure */
  notifyFileUploadStatus(success: boolean, message: string) {
    this.fileUploadStatus.next({ success, message });
  }

  setIssueId(issueId: string) {
    this.issueIdSource.next(issueId);
  }
}
