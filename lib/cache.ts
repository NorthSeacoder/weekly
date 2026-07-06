const cache = new Map<string, unknown>();
const inFlight = new Map<string, Promise<unknown>>();

export async function getCachedData<T>(
    key: string,
    fetchData: () => Promise<T>,
    options: {debug?: boolean} = {}
): Promise<T> {
    // 尝试从缓存获取数据
    if (cache.has(key)) {
        if (options.debug) {
            console.log(`[cache] hit: ${key}`);
        }
        return cache.get(key) as T;
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
