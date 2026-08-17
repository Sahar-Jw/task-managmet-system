'use client';

import {
  usePathname,
} from 'next/navigation';

import {
  AuthProvider,
} from '@/lib/auth-context';

import {
  NotificationsProvider,
} from '@/lib/notifications-context';

import {
  ListLabelsProvider,
} from '@/lib/list-labels-context';

import {
  BrandingProvider,
} from '@/lib/branding-context';



import Navbar from '@/components/Navbar';
import { LoadingProvider } from './loading-context';
import { DictionaryProvider } from '@/lib/dictionary-context';


export default function Shell({
  children,
}: {
  children:
    React.ReactNode;
}) {
  const pathname =
    usePathname();


  const isPublicPage =
    pathname ===
      '/' ||
    pathname ===
      '/login' ||
    pathname ===
      '/register';


  return (
    <LoadingProvider>
      <DictionaryProvider>
        <BrandingProvider>
        <AuthProvider>
          <ListLabelsProvider>
            <NotificationsProvider>
              {!isPublicPage && (
                <Navbar />
              )}


              <main
                className={
                  isPublicPage
                    ? ''
                    : `
                      mx-auto
                      max-w-6xl
                      px-4
                      pb-6
                      pt-[92px]
                    `
                }
              >
                {children}
              </main>
            </NotificationsProvider>
          </ListLabelsProvider>
        </AuthProvider>
        </BrandingProvider>
      </DictionaryProvider>
    </LoadingProvider>
  );
}
