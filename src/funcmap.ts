import * as vscode from 'vscode';

export class FuncMap {

    public all(): vscode.CompletionItem[] {
        return this.sprigFuncs().concat(this.builtinFuncs()).concat(this.helmFuncs())
    }

    public helmFuncs(): vscode.CompletionItem[] {
        return [
            this.f("include", "include $str $ctx", "(chainable) include the named template with the given context.")
        ]
    }

    public builtinFuncs(): vscode.CompletionItem[] {
        return [
            this.f("template", "template $str $ctx", "render the template at location $str"),
            this.f("define", "define $str", "define a template with the name $str")
        ]
    }

    public sprigFuncs():vscode.CompletionItem[] {
        return [
            // String
            this.f("trim", "trim $str", "remove space from either side of string"),
            this.f("trimAll", "trimAll $trim $str", "remove $trim from either side of $str"),
            this.f("trimSuffix", "trimSuffix $pre $str", "trim suffix from string"),
            this.f("upper", "upper $str", "convert string to uppercase"),
            this.f("lower", "lower $str", "convert string to lowercase"),
            this.f("title", "title $str", "convert string to title case"),
            this.f("untitle", "untitle $str", "convert string from title case"),
            this.f("substr", "substr $start $len $string", "get a substring of $string, starting at $start and reading $len characters"),
            this.f("repeat", "repeat $count $str", "repeat $str $count times"),
            this.f("nospace", "nospace $str", "remove space from inside a string"),
            this.f("upper", "upper $str", "convert string to uppercase"),
            this.f("trunc", "trunc $max $str", "truncate $str at $max characters"),
            this.f("abbrev", "abbrev $max $str", "truncate $str with elipses at max length $max"),
            this.f("abbrevboth", "abbrevboth $left $right $str", "abbreviate both $left and $right sides of $string"),
            this.f("initials", "initials $str", "create a string of first characters of each word in $str"),
            this.f("randAscii", "randAscii", "generate a random string of ASCII characters"),
            this.f("randNumeric", "randNumeric", "generate a random string of numeric characters"),
            this.f("randAlpha", "randAlpha", "generate a random string of alphabetic ASCII characters"),
            this.f("randAlphaNum", "randAlphaNum", "generate a random string of ASCII alphabetic and numeric characters"),
            this.f("wrap", "wrap $col $str", "wrap $str text at $col columns"),
            this.f("wrapWith", "wrapWith $col $wrap $str", "wrap $str with $wrap ending each line at $col columns"),
            this.f("contains", "contains $needle $haystack", "returns true if string $needle is present in $haystack"),
            this.f("hasPrefix", "hasPrefix $pre $str", "returns true if $str begins with $pre"),
            this.f("hasSuffix", "hasSuffix $suf $str", "returns true if $str ends with $suf"),
            this.f("quote", "quote $str", "surround $str with double quotes (\")"),
            this.f("squote", "squote $str", "surround $str with single quotes (')"),
            this.f("cat", "cat $str1 $str2 ...", "concatenate all given strings into one, separated by spaces"),
            this.f("indent", "indent $count $str", "indent $str with $count space chars on the left"),
            this.f("replace", "replace $find $replace $str", "find $find and replace with $replace"),
            // String list
            this.f("plural", "plural $singular $plural $count", "if $count is 1, return $singular, else return $plural"),
            this.f("join", "join $sep $str1 $str2 ...", "concatenate all given strings into one, separated by $sep"),
            this.f("splitList", "splitList $sep $str", "split $str into a list of strings, separating at $sep"),
            this.f("split", "split $sep $str", "split $str on $sep and store results in a dictionary"),
            this.f("sortAlpha", "sortAlpha $strings", "sort a list of strings into alphabetical order"),
            // Math
            this.f("add", "add $a $b $c", "add two or more numbers"),
            this.f("add1", "add1 $a", "increment $a by 1"),
            this.f("sub", "sub $a $b", "subtract $a from $b"),
            this.f("div", "div $a $b", "divide $b by $a"),
            this.f("mod", "mod $a $b", "modulo $b by $a"),
            this.f("mul", "mult $a $b", "multiply $b by $a"),
            this.f("max", "max $a $b ...", "return max integer"),
            this.f("min", "min $a $b ...", "return min integer"),
            // Integer list
            this.f("until", "until $count", "return a list of integers beginning with 0 and ending with $until - 1"),
            this.f("untilStep", "untilStep $start $max $step", "start with $start, and add $step until reaching $max"),
            // Date
            // Defaults
            // Encoding
            // Lists
            // Dictionaries
            // Type Conversion
            // File Path
            // UUID
            // OS
            // SemVer
            // Reflection
            // Crypto
        ]
    }

    f(name: string, args: string, doc: string): vscode.CompletionItem {
        let i = new vscode.CompletionItem(name, vscode.CompletionItemKind.Function)
        i.detail = args
        i.documentation = doc
        return i
    }
}