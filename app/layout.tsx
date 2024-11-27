import Footer from '@/components/footer/Footer';
import Header from '@/components/header/Header';
import { TailwindIndicator } from '@/components/theme/TailwindIndicator';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import { siteConfig } from '@/config/site';
import { getWeeklyPosts } from '@/lib/weekly';
import '@/styles/globals.css';
import '@/styles/loading.css';
import dayjs from 'dayjs';
import updateLocale from 'dayjs/plugin/updateLocale';
import { Viewport } from 'next';
import { ViewTransitions } from 'next-view-transitions';
import UmamiAnalysis from './umami-analysis';

dayjs.extend(updateLocale);
dayjs.updateLocale('en', {
    weekStart: 1
});

export const metadata = {
    ...siteConfig,
    title: siteConfig.name
};

export const viewport: Viewport = {
    themeColor: siteConfig.themeColors
};

// 预先获取周刊数据
const posts = getWeeklyPosts();

export default function RootLayout({children}: {children: React.ReactNode}) {
    return (
        <ViewTransitions>
            <html lang='en' suppressHydrationWarning>
                <head />
                <body className='min-h-screen bg-background antialiased'>
                    <ThemeProvider
                        attribute='class'
                        enableSystem={false}
                        defaultTheme={siteConfig.defaultNextTheme}
                        forcedTheme={siteConfig.defaultNextTheme}>
                        <Header posts={posts} />
                        <main className='flex flex-col items-center py-6'>{children}</main>
                        <Footer />
                        <TailwindIndicator />
                    </ThemeProvider>
                    {process.env.NODE_ENV === 'development' ? (
                        <></>
                    ) : (
                        <>
                            <UmamiAnalysis />
                        </>
                    )}
                </body>
            </html>
        </ViewTransitions>
    );
}
