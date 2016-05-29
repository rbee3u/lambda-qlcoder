#  An Online Lambda Interpreter

在计算机装逼界我们经常能听到类似这样的对话
```
师妹：师兄，你说是不是所有非递归算法都能写成递归形式呀？
师兄：对啊，否则的话图灵机和lambda演算岂不是不等价了！
```

其实对于大部分人而言lambda演算这个概念并不算陌生，很多现代的编程语言(C++/Java/Python/...)都或多或少地支持一些函数式编程特性。因此当你在讨论匿名函数的时候，其实你已经在和lambda演算打交道了。可以这样说，是lambda演算构成了函数式编程的基石。

那么究竟什么是lambda演算呢，我们可以用Backus-Naur Form来定义它的文法:

```
<expression> ::= <name> | <function> | <application>
<function> ::= λ<name>.<expression>
<application> ::= (<expression> <expression>)
```

当然你可能会问`<name>`怎么定义的呢，好吧其实这只是个无关紧要的问题，更为详细的关于lambda演算的资料可以参考 [Lambda calculus](https://en.wikipedia.org/wiki/Lambda_calculus)。等你搞清楚 `α-conversion`、`β-reduction`、`η-conversion`、`currying`
、`call-by-name`、`call-by-value` 这些概念后，你也可以自豪地向别人吹逼说自己"精通"lambda演算了。

不过在吹逼之前可不可以先帮我解决一个问题？

问题是这样的：作为函数式编程语言学家(渣)的 Harry Harte 自从学习了lambda演算后心潮澎湃久久不能平静，于是花了一下午的时间发明了lambda编程语言并且强行撸了一个call-by-value的lambda语言求值器。同样可以用Backus-Naur Form来定义它的文法:

```
<expression> ::= <name> | <function> | <application>
<function> ::= \<name>.<expression>
<application> ::= (<expression> <expression>)
```

可以发现唯一的一个区别是`λ <-> \`，这个主要是为了让我们可以直接用ascii来编码。为了把大家从繁琐的低级构建任务中解放出来，勤劳又勇敢的 Harry Harte 还增加了`<number>`(非负整数)和`<boolean>`(`true`/`false`)两种类型并且实现了`add`/`sub`/`mul`/`div`/`rem`/`and`/`or`/`not`/`cond`/`gt`/`gte`/`lt`/`lte`/`eq`/`neq`这些内置函数。也就是说你可以在lambda编程语言里直接使用它们，为了防止它们被覆盖而失效，因此函数形参不建议使用这些词。

为了让没基础过lambda的coder更容易理解，提供下面几个例子。

样例一: 平方函数，入参是n，返回n*n，样例返回 `64`
```
(\n.((mul n) n) 8)
```
样例二: 判断一个数是不是小于5，如果小于5输出1，否则输出0，样例返回 `0`
```
(\n.(((cond ((lt n) 5)) \_.1) \_.0) 6)
```
样例三: 计算一个数的阶乘，样例返回 `362880`
```
((\f.(\u.(u u) \x.(f \v.((x x) v)))
\factorial.\n.(
    ((cond ((lt n) 2)) \_.1)
    \_.((mul (factorial ((sub n) 1))) n)
)) 9)
```
现在 Harry Harte 需要利用该语言写一个`fibonacci`函数，希望"精通"函数式编程的你能够帮他完成。为了方便你的调试，这里提供一个简易的lambda在线编辑器: [An Online Lambda Interpreter](https://rbee3u.github.io/lambda-qlcoder/editor.html)。
