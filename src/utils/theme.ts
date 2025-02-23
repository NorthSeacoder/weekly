// src/lib/themes.ts

export const themes: Record<string, string> = {
    // Core Tech Themes (基础科技感主题)
    quantum:
        'bg-blue-600 bg-opacity-30 text-blue-700 border-blue-600 dark:bg-blue-500 dark:bg-opacity-20 dark:text-blue-400 dark:border-blue-500',
    neon: 'bg-cyan-600 bg-opacity-30 text-cyan-700 border-cyan-600 dark:bg-cyan-500 dark:bg-opacity-20 dark:text-cyan-400 dark:border-cyan-500',
    matrix: 'bg-green-600 bg-opacity-30 text-green-700 border-green-600 dark:bg-green-500 dark:bg-opacity-20 dark:text-green-400 dark:border-green-500',
    cyber: 'bg-purple-600 bg-opacity-30 text-purple-700 border-purple-600 dark:bg-purple-500 dark:bg-opacity-20 dark:text-purple-400 dark:border-purple-500',
    grid: 'bg-indigo-600 bg-opacity-30 text-indigo-700 border-indigo-600 dark:bg-indigo-500 dark:bg-opacity-20 dark:text-indigo-400 dark:border-indigo-500',

    // Data & Network Themes (数据与网络相关主题)
    dataflow:
        'bg-teal-600 bg-opacity-30 text-teal-700 border-teal-600 dark:bg-teal-500 dark:bg-opacity-20 dark:text-teal-400 dark:border-teal-500',
    stream: 'bg-sky-600 bg-opacity-30 text-sky-700 border-sky-600 dark:bg-sky-500 dark:bg-opacity-20 dark:text-sky-400 dark:border-sky-500',
    pulse: 'bg-emerald-600 bg-opacity-30 text-emerald-700 border-emerald-600 dark:bg-emerald-500 dark:bg-opacity-20 dark:text-emerald-400 dark:border-emerald-500',
    node: 'bg-lime-600 bg-opacity-30 text-lime-700 border-lime-600 dark:bg-lime-500 dark:bg-opacity-20 dark:text-lime-400 dark:border-lime-500',
    link: 'bg-amber-600 bg-opacity-30 text-amber-700 border-amber-600 dark:bg-amber-500 dark:bg-opacity-20 dark:text-amber-400 dark:border-amber-500',

    // AI & Machine Learning Themes (人工智能与机器学习主题)
    neural: 'bg-violet-600 bg-opacity-30 text-violet-700 border-violet-600 dark:bg-violet-500 dark:bg-opacity-20 dark:text-violet-400 dark:border-violet-500',
    algo: 'bg-fuchsia-600 bg-opacity-30 text-fuchsia-700 border-fuchsia-600 dark:bg-fuchsia-500 dark:bg-opacity-20 dark:text-fuchsia-400 dark:border-fuchsia-500',
    model: 'bg-rose-600 bg-opacity-30 text-rose-700 border-rose-600 dark:bg-rose-500 dark:bg-opacity-20 dark:text-rose-400 dark:border-rose-500',
    predict:
        'bg-pink-600 bg-opacity-30 text-pink-700 border-pink-600 dark:bg-pink-500 dark:bg-opacity-20 dark:text-pink-400 dark:border-pink-500',
    learn: 'bg-orange-600 bg-opacity-30 text-orange-700 border-orange-600 dark:bg-orange-500 dark:bg-opacity-20 dark:text-orange-400 dark:border-orange-500',

    // Space & Futuristic Themes (太空与未来感主题)
    orbit: 'bg-gray-600 bg-opacity-30 text-gray-700 border-gray-600 dark:bg-gray-500 dark:bg-opacity-20 dark:text-gray-400 dark:border-gray-500',
    galaxy: 'bg-stone-600 bg-opacity-30 text-stone-700 border-stone-600 dark:bg-stone-500 dark:bg-opacity-20 dark:text-stone-400 dark:border-stone-500',
    stellar:
        'bg-slate-600 bg-opacity-30 text-slate-700 border-slate-600 dark:bg-slate-500 dark:bg-opacity-20 dark:text-slate-400 dark:border-slate-500',
    cosmo: 'bg-blue-700 bg-opacity-30 text-blue-800 border-blue-700 dark:bg-blue-600 dark:bg-opacity-20 dark:text-blue-500 dark:border-blue-600',
    nova: 'bg-cyan-700 bg-opacity-30 text-cyan-800 border-cyan-700 dark:bg-cyan-600 dark:bg-opacity-20 dark:text-cyan-500 dark:border-cyan-600',

    // Energy & Power Themes (能源与动力主题)
    charge: 'bg-yellow-600 bg-opacity-30 text-yellow-700 border-yellow-600 dark:bg-yellow-500 dark:bg-opacity-20 dark:text-yellow-400 dark:border-yellow-500',
    volt: 'bg-amber-700 bg-opacity-30 text-amber-800 border-amber-700 dark:bg-amber-600 dark:bg-opacity-20 dark:text-amber-500 dark:border-amber-600',
    flux: 'bg-lime-700 bg-opacity-30 text-lime-800 border-lime-700 dark:bg-lime-600 dark:bg-opacity-20 dark:text-lime-500 dark:border-lime-600',
    power: 'bg-orange-700 bg-opacity-30 text-orange-800 border-orange-700 dark:bg-orange-600 dark:bg-opacity-20 dark:text-orange-500 dark:border-orange-600',
    surge: 'bg-red-600 bg-opacity-30 text-red-700 border-red-600 dark:bg-red-500 dark:bg-opacity-20 dark:text-red-400 dark:border-red-500',

    // Extended Tech Themes (扩展科技主题，逐步递增到 200 个)
    sync: 'bg-teal-700 bg-opacity-30 text-teal-800 border-teal-700 dark:bg-teal-600 dark:bg-opacity-20 dark:text-teal-500 dark:border-teal-600',
    byte: 'bg-indigo-700 bg-opacity-30 text-indigo-800 border-indigo-700 dark:bg-indigo-600 dark:bg-opacity-20 dark:text-indigo-500 dark:border-indigo-600',
    pixel: 'bg-purple-700 bg-opacity-30 text-purple-800 border-purple-700 dark:bg-purple-600 dark:bg-opacity-20 dark:text-purple-500 dark:border-purple-600',
    code: 'bg-green-700 bg-opacity-30 text-green-800 border-green-700 dark:bg-green-600 dark:bg-opacity-20 dark:text-green-500 dark:border-green-600',
    hash: 'bg-sky-700 bg-opacity-30 text-sky-800 border-sky-700 dark:bg-sky-600 dark:bg-opacity-20 dark:text-sky-500 dark:border-sky-600',
    vector: 'bg-emerald-700 bg-opacity-30 text-emerald-800 border-emerald-700 dark:bg-emerald-600 dark:bg-opacity-20 dark:text-emerald-500 dark:border-emerald-600',
    signal: 'bg-violet-700 bg-opacity-30 text-violet-800 border-violet-700 dark:bg-violet-600 dark:bg-opacity-20 dark:text-violet-500 dark:border-violet-600',
    fiber: 'bg-fuchsia-700 bg-opacity-30 text-fuchsia-800 border-fuchsia-700 dark:bg-fuchsia-600 dark:bg-opacity-20 dark:text-fuchsia-500 dark:border-fuchsia-600',
    wave: 'bg-rose-700 bg-opacity-30 text-rose-800 border-rose-700 dark:bg-rose-600 dark:bg-opacity-20 dark:text-rose-500 dark:border-rose-600',
    echo: 'bg-pink-700 bg-opacity-30 text-pink-800 border-pink-700 dark:bg-pink-600 dark:bg-opacity-20 dark:text-pink-500 dark:border-pink-600',

    // 继续扩展到 200 个主题（以下为示例模式，完整版可按需生成）
    core: 'bg-blue-800 bg-opacity-30 text-blue-900 border-blue-800 dark:bg-blue-700 dark:bg-opacity-20 dark:text-blue-400 dark:border-blue-700',
    nano: 'bg-cyan-800 bg-opacity-30 text-cyan-900 border-cyan-800 dark:bg-cyan-700 dark:bg-opacity-20 dark:text-cyan-400 dark:border-cyan-700',
    chip: 'bg-green-800 bg-opacity-30 text-green-900 border-green-800 dark:bg-green-700 dark:bg-opacity-20 dark:text-green-400 dark:border-green-700',
    circuit:
        'bg-purple-800 bg-opacity-30 text-purple-900 border-purple-800 dark:bg-purple-700 dark:bg-opacity-20 dark:text-purple-400 dark:border-purple-700',
    module: 'bg-indigo-800 bg-opacity-30 text-indigo-900 border-indigo-800 dark:bg-indigo-700 dark:bg-opacity-20 dark:text-indigo-400 dark:border-indigo-700',
    relay: 'bg-teal-800 bg-opacity-30 text-teal-900 border-teal-800 dark:bg-teal-700 dark:bg-opacity-20 dark:text-teal-400 dark:border-teal-700',
    beam: 'bg-sky-800 bg-opacity-30 text-sky-900 border-sky-800 dark:bg-sky-700 dark:bg-opacity-20 dark:text-sky-400 dark:border-sky-700',
    drone: 'bg-emerald-800 bg-opacity-30 text-emerald-900 border-emerald-800 dark:bg-emerald-700 dark:bg-opacity-20 dark:text-emerald-400 dark:border-emerald-700',
    bot: 'bg-lime-800 bg-opacity-30 text-lime-900 border-lime-800 dark:bg-lime-700 dark:bg-opacity-20 dark:text-lime-400 dark:border-lime-700',
    scan: 'bg-amber-800 bg-opacity-30 text-amber-900 border-amber-800 dark:bg-amber-700 dark:bg-opacity-20 dark:text-amber-400 dark:border-amber-700',

    // 以下为占位主题，完整版可根据需要扩展命名和颜色
    tech1: 'bg-violet-800 bg-opacity-30 text-violet-900 border-violet-800 dark:bg-violet-700 dark:bg-opacity-20 dark:text-violet-400 dark:border-violet-700',
    tech2: 'bg-fuchsia-800 bg-opacity-30 text-fuchsia-900 border-fuchsia-800 dark:bg-fuchsia-700 dark:bg-opacity-20 dark:text-fuchsia-400 dark:border-fuchsia-700',
    tech3: 'bg-rose-800 bg-opacity-30 text-rose-900 border-rose-800 dark:bg-rose-700 dark:bg-opacity-20 dark:text-rose-400 dark:border-rose-700',
    tech4: 'bg-pink-800 bg-opacity-30 text-pink-900 border-pink-800 dark:bg-pink-700 dark:bg-opacity-20 dark:text-pink-400 dark:border-pink-700',
    tech5: 'bg-orange-800 bg-opacity-30 text-orange-900 border-orange-800 dark:bg-orange-700 dark:bg-opacity-20 dark:text-orange-400 dark:border-orange-700'
};
