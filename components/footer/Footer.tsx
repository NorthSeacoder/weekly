import FooterLinks from '@/components/footer/FooterLinks';
import FooterProducts from '@/components/footer/FooterProducts';
import {siteConfig} from '@/config/site';
import Link from 'next/link';

const Footer = () => {
    const d = new Date();
    const currentYear = d.getFullYear();
    const {authors} = siteConfig;

    return (
        <footer>
            <div className='mt-16 space-y-2 pt-6 pb-4 flex flex-col items-center text-sm text-gray-400 border-t border-gray-600'>
                <FooterLinks />
                <FooterProducts />
                <div className='flex space-x-2'>
                    <div>{`©${currentYear}`}</div>{' '}
                    <Link href={authors[0].twitter || authors[0].url} target='_blank'>
                        {authors[0].name}
                    </Link>{' '}
                    <div>All rights reserved.</div>
                    <div className='text-xs leading-3 flex items-center justify-center'>
                        <img src='/gongan.png' alt='' className='inline-block w-3 h-3' />
                        <a
                            className='  ml-1'
                            href='https://beian.mps.gov.cn/#/query/webSearch?code=11010502054628'
                            rel='noreferrer'
                            target='_blank'>
                            京公网安备11010502054628
                        </a>
                        <a className=' ml-2' href='https://beian.miit.gov.cn/' target='_blank'>
                            京ICP备2024042617号-1
                        </a>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
