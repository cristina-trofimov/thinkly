import type { QuestionTemplate } from "../../types/questions/QuestionTemplate.type";


export const CodeMultiLangTemplate: Record<string, QuestionTemplate> = {
    Java: {
        monacoID: "java",
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
        monacoID: "python",
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
    "Objective-C": {
        monacoID: "objective-c",
        codeBuilder: (problemName, inputVars, outputType) =>
            `#import <Foundation/Foundation.h>

@interface ${problemName} : NSObject
+ (NSArray *)solution:(NSArray *)nums target:(NSNumber *)target;
@end

int main(int argc, const char * argv[]) {
    // TODO
    return 0;

if __name__ == "__main__":
    """
    :input(s)
    ${inputVars.map(v => `# ${v.type} ${v.name}`).join('\n    ')}
    
    :rtype ${outputType}
    """
    ${problemName}(${inputVars.map(v => v.name).join(', ')})
}`.trim()
    },
    C: {
        monacoID: "c",
        codeBuilder: (problemName, inputVars, outputType) =>
            `#include <stdio.h>
// ${problemName}
// ${outputType}
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
        monacoID: "csharp",
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
        monacoID: "cpp",
        codeBuilder: (problemName, inputVars, outputType) =>
            `#include <iostream>
using namespace std;
// ${problemName}

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
        monacoID: "kotlin",
        codeBuilder: (problemName, inputVars, outputType) =>
            `fun main(){
    ${inputVars.map(v => `// ${v.type} ${v.name}`).join('\n    ')}
    // ${problemName}
    // ${outputType}
    solution(${inputVars.map(v => v.name).join(', ')})
}

fun solution(${inputVars.map(v => `${v.name}: ${v.type}`).join(', ')}){
    // TODO
}`.trim()
    },
    "Typescript": {
        monacoID: "typescript",
        codeBuilder: (problemName, inputVars, outputType) =>
            `function ${problemName}(${inputVars.map(v => `${v.name}: ${v.type}`).join(', ')}): ${outputType} {
    // TODO
    return null as any
}

export default ${problemName};`.trim()
    },
    "Javascript": {
        monacoID: "javascript",
        codeBuilder: (problemName, inputVars, outputType) =>
            `function ${problemName}(${inputVars.map(v => v.name).join(', ')}) {
    // ${outputType}
    // TODO
}

module.exports = ${problemName}`.trim()
    },
    "Ruby": {
        monacoID: "ruby",
        codeBuilder: (problemName, inputVars, outputType) =>
            `def ${problemName}(${inputVars.map(v => v.name).join(", ")})
    # ${outputType}
    # TODO
end

if __FILE__ == $0
    ${inputVars.map(v => `# ${v.name} = ...`).join("\n    ")}
    ${problemName}(${inputVars.map(v => v.name).join(', ')})
end`.trim()
    },
    "Rust": {
        monacoID: "rust",
        codeBuilder: (problemName, inputVars, outputType) =>
            `fn main() {
    ${inputVars.map(v => `// ${v.type} ${v.name}`).join('\n    ')}
    // ${problemName}
    // ${outputType}
    solution(${inputVars.map(v => v.name).join(', ')})
}

fn solution(${inputVars.map(v => `${v.name}: ${v.type}`).join(', ')}) {
    // TODO
    todo!()
}`.trim()
    },
    "Erlang": {
        monacoID: "erlang",
        codeBuilder: (problemName, inputVars, outputType) =>
            `-module(${problemName.toLowerCase()}).
-export([main/0]).

% ${problemName}
% ${outputType}
    
main() ->
    ${inputVars.map(v => `% ${v.name} = ...`).join("\n    ")}
    _ = solve(${inputVars.map(v => v.name).join(', ')}),
    ok.
    
solve(${inputVars.map(v => v.name).join(', ')}) ->
    % TODO
    ok.`.trim()
    }
}