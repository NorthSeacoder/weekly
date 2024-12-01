interface Config {
    lskyToken: string;
    apiBaseUrl: string;
    openaiKey: string;
    modelName: string;
}
import {useCallback, useEffect, useState} from 'react';

export function useConfig() {
    const [config, setConfigState] = useState<Config>({
        lskyToken: '',
        apiBaseUrl: '',
        openaiKey: '',
        modelName: ''
    });

    // 初始化时从 storage 读取配置
    useEffect(() => {
        chrome.storage.local.get(['lskyToken', 'apiBaseUrl', 'openaiKey', 'modelName']).then((result) => {
            setConfigState((prev) => ({
                ...prev,
                lskyToken: result.lskyToken || '',
                apiBaseUrl: result.apiBaseUrl || '',
                openaiKey: result.openaiKey || '',
                modelName: result.modelName || ''
            }));
        });
    }, []);

    // 更新配置的函数
    const setConfig = useCallback((updates: Partial<Config>) => {
        setConfigState((prev) => {
            const newConfig = {...prev, ...updates};
            // 保存到 storage
            chrome.storage.local.set(updates);
            return newConfig;
        });
    }, []);

    return {config, setConfig};
}
