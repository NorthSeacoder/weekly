interface Config {
    lskyToken: string;
    apiBaseUrl: string;
    openaiKey: string;
    modelName: string;
    visionModel: string;
    visionBaseUrl?: string;
    visionKey?: string;
}
import {useCallback, useEffect, useState} from 'react';

export function useConfig() {
    const [config, setConfigState] = useState<Config>({
        lskyToken: '',
        apiBaseUrl: 'https://api.smnet.asia/v1',
        openaiKey: '',
        modelName: 'deepseek-chat',
        visionModel: '',
        visionBaseUrl: '',
        visionKey: ''
    });

    // 初始化时从 storage 读取配置
    useEffect(() => {
        chrome.storage.local
            .get(['lskyToken', 'apiBaseUrl', 'openaiKey', 'modelName', 'visionModel', 'visionBaseUrl', 'visionKey'])
            .then((result) => {
                setConfigState((prev) => ({
                    ...prev,
                    lskyToken: result.lskyToken || '',
                    apiBaseUrl: result.apiBaseUrl || prev.apiBaseUrl,
                    openaiKey: result.openaiKey || '',
                    modelName: result.modelName || prev.modelName,
                    visionModel: result.visionModel || prev.visionModel,
                    visionBaseUrl: result.visionBaseUrl || prev.visionBaseUrl,
                    visionKey: result.visionKey || ''
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
