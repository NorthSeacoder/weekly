import NodeCache from 'node-cache';

// 创建一个全局的缓存实例
const cache = new NodeCache({
    stdTTL: 0, // 永不过期
    checkperiod: 0, // 禁用清理检查
    useClones: false // 禁用克隆以提高性能
});

const inFlight = new Map<string, Promise<unknown>>();

export async function getCachedData<T>(
    key: string,
    fetchData: () => Promise<T>,
    options: {debug?: boolean} = {}
): Promise<T> {
    // 尝试从缓存获取数据
    const cachedData = cache.get<T>(key);
    if (cachedData !== undefined) {
        if (options.debug) {
            console.log(`[cache] hit: ${key}`);
        }
        return cachedData;
    }

    const existingPromise = inFlight.get(key);
    if (existingPromise) {
        if (options.debug) {
            console.log(`[cache] await: ${key}`);
        }
        return existingPromise as Promise<T>;
    }

    // 如果缓存中没有，则获取新数据
    if (options.debug) {
        console.log(`[cache] miss: ${key}`);
    }

    const promise = fetchData()
        .then((freshData) => {
            cache.set(key, freshData);
            return freshData;
        })
        .finally(() => {
            inFlight.delete(key);
        });

    inFlight.set(key, promise);
    return promise;
}
