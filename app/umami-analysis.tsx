const UmamiAnalytics = () => {
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

export default UmamiAnalytics;
