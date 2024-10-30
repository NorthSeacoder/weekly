/// <reference types="chrome"/>
import {useEffect, useState} from 'react';

export function useStorage() {
    const [apiKey, setApiKeyState] = useState('');
    const [baseURL, setBaseURLState] = useState('https://api.smnet.asia/v1');
    const [modelName, setModelNameState] = useState('deepseek-chat');

    useEffect(() => {
        chrome.storage.local.get(['openaiKey', 'baseURL', 'modelName']).then((result) => {
            if (result.openaiKey) setApiKeyState(result.openaiKey);
            if (result.baseURL) setBaseURLState(result.baseURL);
            if (result.modelName) setModelNameState(result.modelName);
        });
    }, []);

    const setApiKey = (key: string) => {
        setApiKeyState(key);
        chrome.storage.local.set({openaiKey: key});
    };

    const setBaseURL = (url: string) => {
        setBaseURLState(url);
        chrome.storage.local.set({baseURL: url});
    };

    const setModelName = (model: string) => {
        setModelNameState(model);
        chrome.storage.local.set({modelName: model});
    };

    return {
        apiKey,
        setApiKey,
        baseURL,
        setBaseURL,
        modelName,
        setModelName
    };
}
