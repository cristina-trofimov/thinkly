import type { ProblemTemplate } from "../interfaces/ProblemTemplate";


export const CodeMultiLangTemplate: Record<string, ProblemTemplate> = {

    Java: {
        fileExt: "java",
        template: 'vanilla', // ???
        codeBuilder: (problemName, inputVars, outputType) =>
            `class ${problemName} {
            public static void main(String[] args) {
                Solution(${inputVars.map(v => v.name).join(', ')})
            }

            static ${outputType} Solution(${inputVars.map(v => `${v.type} ${v.name}`).join(', ')}) {
                // 
            }
        }`
    },
    Python: {
        fileExt: "py",
        template: 'vanilla', // ???
        codeBuilder: (problemName, inputVars, outputType) =>
        `def ${problemName}(${inputVars.map(v => v.name).join(', ')}}):
        # TODO
        pass

    if __name__ == "__main__":
        """
        :input(s)
        ${inputVars.map(v => `// ${v.type} ${v.name}`).join('\n')}

        :rtype ${outputType}
        """
        ${problemName}(${inputVars.map(v => v.name).join(', ')})`
    },
    Python3: {
        fileExt: "py",
        template: 'vanilla', // ???
        codeBuilder: (problemName, inputVars, outputType) =>
        `import sys
            def ${problemName}(${inputVars.map(v => v.name).join(', ')}):
                # TODO
                pass

            if __name__ == "__main__":
                """
                :input(s)
                ${inputVars.map(v => `// ${v.type} ${v.name}`).join('\n')}
                
                :rtype ${outputType}
                """
                ${problemName}(${inputVars.map(v => v.name).join(', ')})`
    },
    C: {
        fileExt: "c",
        template: 'vanilla', // ???
        codeBuilder: (problemName, inputVars, outputType) =>
        `#include <stdio.h>
            void solution(${inputVars.map(v => `${v.type} ${v.name}`).join(', ')}) {
                // TODO
            }

            int main() {
                ${inputVars.map(v => `// ${v.type} ${v.name}`).join('\n')}
                solution(${inputVars.map(v => v.name).join(', ')})
                return 0;
            }`
    },
    "C#": {
        fileExt: "cs",
        template: 'vanilla', // ???
        codeBuilder: (problemName, inputVars, outputType) =>
        `using System;
        
            public class ${problemName} {
                public static void Main(string[] args) {
                    ${inputVars.map(v => `// ${v.type} ${v.name}`).join('\n')}
                    Solution(${inputVars.map(v => v.name).join(', ')});
                }

                static ${outputType} Solution(${inputVars.map(v => `${v.type} ${v.name}`).join(', ')}) {
                    // TODO
                }
            }`
    },
    "C++": {
        fileExt: "cs",
        template: 'vanilla', // ???
        codeBuilder: (problemName, inputVars, outputType) =>
        `using System;
        
            public class ${problemName} {
                public static void Main(string[] args) {
                    ${inputVars.map(v => `// ${v.type} ${v.name}`).join('\n')}
                    Solution(${inputVars.map(v => v.name).join(', ')});
                }

                static ${outputType} Solution(${inputVars.map(v => `${v.type} ${v.name}`).join(', ')}) {
                    // TODO
                }
            }`
    },
    "Kotlin": {
        fileExt: "kt",
        template: 'vanilla', // ???
        codeBuilder: (problemName, inputVars, outputType) =>
        `fun main(){
            ${inputVars.map(v => `// ${v.type} ${v.name}`).join('\n')}
            solution(${inputVars.map(v => v.name).join(', ')})
        }
        fun solve(${inputVars.map(v => `${v.name}: ${v.type}`).join(', ')}){
            // TODO
        }`
    },
    "Typescript": {
        fileExt: "ts",
        template: 'node', // ???
        codeBuilder: (problemName, inputVars, outputType) =>
        `function ${problemName}(${inputVars.map(v => `${v.name}${`: ${v.type}`}`).join(', ')}: { ${inputVars.map(v => `${v.name}: ${v.type}`).join(', ')} }): void {
            // TODO
        }

        export default ${problemName};`
    },
    "Javascript": {
        fileExt: "js",
        template: 'node', // ???
        codeBuilder: (problemName, inputVars, outputType) =>
        `function ${problemName}(${inputVars.map(v => v.name).join(', ')}): {
            // TODO
        }
        module.exports = ${problemName}`
    },
    "Ruby": {
        fileExt: "rb",
        template: 'vanilla', // ???
        codeBuilder: (problemName, inputVars, outputType) =>
        `def ${problemName}(${inputVars.map(v => v.name).join(", ")})
            # TODO
        end
    
        if __FILE__ == $0
            ${inputVars.map(v => `# ${v.name} = ...`).join("\n")}
            ${problemName}(${inputVars.map(v => v.name).join(', ')})
        end`
    },
    "Rust": {
        fileExt: "rs",
        template: 'vanilla', // ???
        codeBuilder: (problemName, inputVars, outputType) =>
        `fn main() {
            ${inputVars.map(v => `// ${v.type} ${v.name}`).join('\n')}
            solution(${inputVars.map(v => v.name).join(', ')})
        }
        
        fn solution(${inputVars.map(v => `${v.name}: ${v.type}`).join(', ')}) {
            // TODO
        }`
    },
    "Erlang": {
        fileExt: "erl",
        template: 'vanilla', // ???
        codeBuilder: (problemName, inputVars, outputType) =>
        `-module(${problemName.toLowerCase()}).
            -export([main/0]).
            
            main() ->
                ${inputVars.map(v => `% ${v.name} = ...`).join("\n")}
                _ = solve(${inputVars.map(v => v.name).join(', ')}),
                ok.
            
            solve(${inputVars.map(v => v.name).join(', ')}) ->
                % TODO
                ok.`
    }
}