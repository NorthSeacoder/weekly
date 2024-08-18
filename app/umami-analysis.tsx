'use client';

import Script from 'next/script';

const BaiDuAnalytics = () => {
    return (
        <>
            {process.env.NEXT_PUBLIC_UMAMI ? (
                <script
                    defer
                    src='https://umami.mengpeng.tech/script.js'
                    data-website-id={process.env.NEXT_PUBLIC_UMAMI}></script>
            ) : (
                <></>
            )}
        </>
    );
};

export default BaiDuAnalytics;
