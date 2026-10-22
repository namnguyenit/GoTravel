import com.sun.source.tree.*;
import com.sun.source.util.*;
import javax.tools.*;
import java.nio.file.*;
import java.nio.charset.StandardCharsets;
import java.util.*;

/** Parses source with the JDK Compiler Tree API. Metrics do not prove behavior. */
public class JavaAstAnalyzer {
    static String quote(Object value) { return "\"" + String.valueOf(value).replace("\"", "\"\"").replace("\n", " ").replace("\r", " ") + "\""; }
    static class Metrics extends TreeScanner<Void,Integer> {
        int complexity=1,depth=0,loops=0;
        List<String> conditions=new ArrayList<>(),variables=new ArrayList<>();
        void level(int d){depth=Math.max(depth,d);}
        @Override public Void visitIf(IfTree n,Integer d) {
            complexity++;conditions.add(n.getCondition().toString());level(d+1);
            scan(n.getCondition(),d);scan(n.getThenStatement(),d+1);scan(n.getElseStatement(),d+1);return null;
        }
        @Override public Void visitForLoop(ForLoopTree n,Integer d){complexity++;loops++;level(d+1);return super.visitForLoop(n,d+1);}
        @Override public Void visitEnhancedForLoop(EnhancedForLoopTree n,Integer d){complexity++;loops++;level(d+1);return super.visitEnhancedForLoop(n,d+1);}
        @Override public Void visitWhileLoop(WhileLoopTree n,Integer d){complexity++;loops++;level(d+1);return super.visitWhileLoop(n,d+1);}
        @Override public Void visitDoWhileLoop(DoWhileLoopTree n,Integer d){complexity++;loops++;level(d+1);return super.visitDoWhileLoop(n,d+1);}
        @Override public Void visitCatch(CatchTree n,Integer d){complexity++;level(d+1);return super.visitCatch(n,d+1);}
        @Override public Void visitConditionalExpression(ConditionalExpressionTree n,Integer d){complexity++;return super.visitConditionalExpression(n,d);}
        @Override public Void visitBinary(BinaryTree n,Integer d){if(n.getKind()==Tree.Kind.CONDITIONAL_AND||n.getKind()==Tree.Kind.CONDITIONAL_OR)complexity++;return super.visitBinary(n,d);}
        @Override public Void visitVariable(VariableTree n,Integer d){variables.add(n.getName().toString());return super.visitVariable(n,d);}
    }
    public static void main(String[] args) throws Exception {
        if(args.length!=3)throw new IllegalArgumentException("version sourceRoot outputCsv");
        Path root=Path.of(args[1]);List<String> rows=new ArrayList<>();
        rows.add("version,file,method,line,conditions,mccabe,depth,variables,loops");
        JavaCompiler compiler=ToolProvider.getSystemJavaCompiler();
        if(compiler==null)throw new IllegalStateException("A JDK is required, not just a JRE");
        try(var fm=compiler.getStandardFileManager(null,null,StandardCharsets.UTF_8);var stream=Files.walk(root)) {
            var files=stream.filter(p->p.toString().endsWith(".java")).sorted().toList();
            var task=(JavacTask)compiler.getTask(null,fm,null,List.of("-proc:none"),null,
                    fm.getJavaFileObjectsFromPaths(files));
            var trees=Trees.instance(task);
            for(var unit:task.parse())new TreePathScanner<Void,Void>() {
                @Override public Void visitMethod(MethodTree n,Void unused) {
                    if(n.getBody()!=null) {
                        Metrics m=new Metrics();m.scan(n.getBody(),0);
                        long offset=trees.getSourcePositions().getStartPosition(unit,n);
                        long line=unit.getLineMap().getLineNumber(offset);
                        String file=root.relativize(Path.of(unit.getSourceFile().toUri())).toString().replace('\\','/');
                        rows.add(String.join(",",quote(args[0]),quote(file),quote(n.getName()),quote(line),
                                quote(String.join(" | ",m.conditions)),quote(m.complexity),quote(m.depth),
                                quote(String.join(";",m.variables)),quote(m.loops)));
                    }
                    return super.visitMethod(n,unused);
                }
            }.scan(unit,null);
        }
        Files.write(Path.of(args[2]),rows,StandardCharsets.UTF_8);
        System.out.println("AST_METHODS="+(rows.size()-1));
    }
}
