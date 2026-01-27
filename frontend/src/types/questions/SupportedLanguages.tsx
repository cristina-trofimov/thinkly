export const supportedLanguages = ["Java", "Python", "C", "C#", "C++", "Kotlin", 
    "Typescript", "Javascript", "Ruby", "Rust", "Objective-C"] as const

export type SupportedLanguagesType = typeof supportedLanguages[number]

// export type SupportedLanguages = 
//     "Java" | "Python" | "C" | "C#" | "C++" | "Kotlin" | 
//     "Typescript"| "Javascript" | "Ruby" | "Rust" | "Erlang"
