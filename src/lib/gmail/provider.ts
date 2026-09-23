import { MailProvider } from '@/types/email';
import { GmailMailProvider } from './gmailProvider';
import { DemoMailProvider } from './demoProvider';

let demoProviderInstance: DemoMailProvider | null = null;

export function getMailProvider(accessToken?: string): MailProvider {
  if (accessToken && accessToken.trim().length > 0) {
    return new GmailMailProvider(accessToken);
  }

  if (!demoProviderInstance) {
    demoProviderInstance = new DemoMailProvider();
  }
  return demoProviderInstance;
}
