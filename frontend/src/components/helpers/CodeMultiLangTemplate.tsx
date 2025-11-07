import type { ProblemTemplate } from "../interfaces/ProblemTemplate";


export const CodeMultiLangTemplate: Record<string, ProblemTemplate> = {
    Java: {
        fileExt: "java",
        template: 'vanilla',
        codeBuilder: (problemName, inputVars, outputType) =>
`class ${problemName} {
    public static void main(String[] args) {
        Solution(${inputVars.map(v => v.name).join(', ')})
    }

    static ${outputType} Solution(${inputVars
        .map(v => `${v.type} ${v.name}`).join(', ')}) {
        // TODO
        return /* */;
    }
}`.trim()
    },
    Python: {
        fileExt: "py",
        template: 'vanilla',
        codeBuilder: (problemName, inputVars, outputType) =>
`def ${problemName}(${inputVars.map(v => v.name).join(', ')}):
    # TODO
    pass

if __name__ == "__main__":
    """
    :input(s)
    ${inputVars.map(v => `# ${v.type} ${v.name}`).join('\n    ')}

    :rtype ${outputType}
    """
    ${problemName}(${inputVars.map(v => v.name).join(', ')})`.trim()
    },
    Python3: {
        fileExt: "py",
        template: 'vanilla',
        codeBuilder: (problemName, inputVars, outputType) =>
`import sys
def ${problemName}(${inputVars.map(v => v.name).join(', ')}):
    # TODO
    pass

if __name__ == "__main__":
    """
    :input(s)
    ${inputVars.map(v => `# ${v.type} ${v.name}`).join('\n    ')}
    
    :rtype ${outputType}
    """
    ${problemName}(${inputVars.map(v => v.name).join(', ')})`.trim()
    },
    C: {
        fileExt: "c",
        template: 'vanilla',
        codeBuilder: (problemName, inputVars, outputType) =>
`#include <stdio.h>
void solution(${inputVars.map(v => `${v.type} ${v.name}`).join(', ')}) {
    // TODO
}

int main() {
    ${inputVars.map(v => `// ${v.type} ${v.name}`).join('\n    ')}
    solution(${inputVars.map(v => v.name).join(', ')})
    return 0;
}`.trim()
    },
    "C#": {
        fileExt: "cs",
        template: 'vanilla',
        codeBuilder: (problemName, inputVars, outputType) =>
`using System;

public class ${problemName} {
    public static void Main(string[] args) {
        ${inputVars.map(v => `// ${v.type} ${v.name}`).join('\n        ')}
        Solution(${inputVars.map(v => v.name).join(', ')});
    }

    static ${outputType} Solution(${inputVars.map(v => `${v.type} ${v.name}`).join(', ')}) {
        // TODO
        return default;
    }
}`.trim()
    },
    "C++": {
        fileExt: "cpp",
        template: 'vanilla',
        codeBuilder: (problemName, inputVars, outputType) =>
`#include <iostream>
using namespace std;

${outputType} Solution(${inputVars.map(v => `${v.type} ${v.name}`).join(", ")}) {
    // TODO
    return /*  */;
}

int main() {
    ${inputVars.map(v => `// ${v.type} ${v.name}`).join("\n    ")}
    cout << Solution(${inputVars.map(v => v.name).join(", ")}) << endl;
    return 0;
}`.trim()
    },
    "Kotlin": {
        fileExt: "kt",
        template: 'vanilla',
        codeBuilder: (problemName, inputVars, outputType) =>
`fun main(){
    ${inputVars.map(v => `// ${v.type} ${v.name}`).join('\n    ')}
    solution(${inputVars.map(v => v.name).join(', ')})
}

fun solution(${inputVars.map(v => `${v.name}: ${v.type}`).join(', ')}){
    // TODO
}`.trim()
    },
    "Typescript": {
        fileExt: "ts",
        template: 'node',
        codeBuilder: (problemName, inputVars, outputType) =>
`function ${problemName}(${inputVars.map(v => `${v.name}${`: ${v.type}`}`).join(', ')}: { ${inputVars.map(v => `${v.name}: ${v.type}`).join(', ')} }): void {
    // TODO
    return null as any
}

export default ${problemName};`.trim()
    },
    "Javascript": {
        fileExt: "js",
        template: 'node',
        codeBuilder: (problemName, inputVars, outputType) =>
`function ${problemName}(${inputVars.map(v => v.name).join(', ')}): {
    // TODO
}

module.exports = ${problemName}`.trim()
    },
    "Ruby": {
        fileExt: "rb",
        template: 'vanilla',
        codeBuilder: (problemName, inputVars, outputType) =>
`def ${problemName}(${inputVars.map(v => v.name).join(", ")})
    // TODO
end

if __FILE__ == $0
    ${inputVars.map(v => `// ${v.name} = ...`).join("\n    ")}
    ${problemName}(${inputVars.map(v => v.name).join(', ')})
end`.trim()
    },
    "Rust": {
        fileExt: "rs",
        template: 'vanilla',
        codeBuilder: (problemName, inputVars, outputType) =>
`fn main() {
    ${inputVars.map(v => `// ${v.type} ${v.name}`).join('\n    ')}
    solution(${inputVars.map(v => v.name).join(', ')})
}

fn solution(${inputVars.map(v => `${v.name}: ${v.type}`).join(', ')}) {
    // TODO
    todo!()
}`.trim()
    },
    "Erlang": {
        fileExt: "erl",
        template: 'vanilla',
        codeBuilder: (problemName, inputVars, outputType) =>
`-module(${problemName.toLowerCase()}).
-export([main/0]).
    
main() ->
    ${inputVars.map(v => `% ${v.name} = ...`).join("\n    ")}
    _ = solve(${inputVars.map(v => v.name).join(', ')}),
    ok.
    
solve(${inputVars.map(v => v.name).join(', ')}) ->
    % TODO
    ok.`.trim()
    }
}