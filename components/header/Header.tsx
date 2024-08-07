import HeaderLinks from '@/components/header/HeaderLinks';
import SearchBar from '@/components/header/SearchBar';
import HeaderMenu from '@/components/header/HeaderMenu';
import {siteConfig} from '@/config/site';
import {WeeklyPost} from '@/types/weekly';
import Image from 'next/image';
import Link from 'next/link';

const Header = ({posts}: {posts: WeeklyPost[]}) => {
    return (
        <header className='flex z-40 w-full h-auto py-2 px-2 items-center justify-center data-[menu-open=true]:border-none sticky top-0 inset-x-0 backdrop-blur-lg data-[menu-open=true]:backdrop-blur-xl backdrop-saturate-150 bg-background/70'>
            <nav className='z-40 flex px-0 md:px-6 gap-4 w-full flex-row relative flex-nowrap items-center justify-between h-[var(--navbar-height)] max-w-[1024px]'>
                <div className='flex items-center md:gap-x-12'>
                    <Link href='/' className='flex items-center space-x-1 font-bold'>
                        <Image alt={siteConfig.name} src='/logo.svg' className='w-8 h-8' width={24} height={24} />
                        <span className='text-gray-100 hidden sm:block'>我不知道的周刊</span>
                    </Link>
                    <div className='hidden md:flex items-center gap-4 ml-4 h-12 w-full max-w-fit rounded-full bg-content2 px-4 dark:bg-content1'>
                        <HeaderMenu />
                    </div>
                    <div className='hidden md:flex md:gap-x-6'></div>
                </div>

                <div className='flex items-center'>
                    <SearchBar posts={posts} />
                    <HeaderLinks />
                    {/* <ThemedButton /> */}
                </div>
            </nav>
        </header>
    );
};

export default Header;
