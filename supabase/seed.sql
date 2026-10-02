-- =============================================================================
-- Rookie — demo seed
--
-- Paste into the Supabase SQL editor (runs as `postgres`) AFTER the migrations,
-- or run with `supabase db reset`. Safe to re-run: the cleanup block removes
-- everything this file created before inserting it again.
--
-- All dates are relative to now() so the dashboard always looks "live".
-- Times are UTC (every demo profile uses timezone 'UTC').
--
-- Demo accounts (password for all: Rookie@2026)
--   admin@rookie.dev        Ada Admin          admin
--   instructor@rookie.dev   Linus Mentor       instructor
--   instructor2@rookie.dev  Grace Hopper-Lee   instructor
--   student@rookie.dev      Vaiju              student (main demo account)
--   priya|arjun|sofia|kenji|amara|liam|zara|diego @rookie.dev   students
--
-- Order matters: activity, streaks, achievements and notifications are all
-- produced by triggers, so definitions (achievements) and enrollments are
-- inserted before progress, submissions, attendance and classes.
--
-- Fixed UUID prefixes (so relations are explicit and cleanup is exact):
--   11111111-…  users           55555555-…  roadmaps        99999999-…  assignments
--   22222222-…  courses         66666666-…  roadmap sections aaaaaaaa-… announcements
--   33333333-…  course modules  77777777-…  coding problems bbbbbbbb-… agendas
--   44444444-…  lessons         88888888-…  classes         cccccccc-… agenda items
-- =============================================================================

set timezone to 'UTC';

-- ---------------------------------------------------------------------------
-- 0. Cleanup (idempotency)
-- ---------------------------------------------------------------------------
delete from public.classes        where id::text like '88888888-%';
delete from public.announcements  where id::text like 'aaaaaaaa-%';
delete from public.daily_agendas  where id::text like 'bbbbbbbb-%';
delete from public.roadmaps
 where id::text like '55555555-%'
    or slug in ('full-stack-developer', 'backend-developer', 'cs-fundamentals', 'frontend-developer',
                'software-developer', 'data-engineer', 'ai-engineer');
delete from public.coding_problems
 where id::text like '77777777-%'
    or slug in ('two-sum', 'best-time-to-buy-and-sell-stock', 'maximum-subarray', 'valid-palindrome',
                'reverse-words-in-a-string', 'valid-anagram', 'first-unique-character', 'reverse-linked-list',
                'merge-two-sorted-lists', 'valid-parentheses', 'evaluate-reverse-polish-notation',
                'find-the-winner-of-the-circular-game', 'sliding-window-maximum', 'maximum-depth-of-binary-tree',
                'binary-tree-level-order-traversal', 'merge-intervals', 'binary-search',
                'find-first-and-last-position', 'fizz-buzz', 'count-primes');
delete from public.courses
 where id::text like '22222222-%'
    or slug in ('java-fundamentals', 'data-structures-algorithms', 'dbms', 'operating-systems',
                'computer-networks', 'object-oriented-programming', 'backend-development',
                'frontend-development', 'system-design');
delete from auth.identities
 where user_id in (select id from auth.users where email like '%@rookie.dev' or id::text like '11111111-%');
delete from auth.users where email like '%@rookie.dev' or id::text like '11111111-%';

-- ---------------------------------------------------------------------------
-- Seed helpers (dropped at the end of the file)
-- ---------------------------------------------------------------------------
create schema if not exists rookie_seed;

-- A moment `p_days_ago` days back at `p_hours` past UTC midnight, never later
-- than "just now" (so activity for today is never in the future).
create or replace function rookie_seed.ago(p_days_ago int, p_hours numeric default 12)
returns timestamptz language sql stable as $$
  select greatest(
    date_trunc('day', now()) - make_interval(days => p_days_ago),
    least(date_trunc('day', now()) - make_interval(days => p_days_ago) + p_hours * interval '1 hour',
          now() - interval '2 minutes'))
$$;

-- A fixed wall-clock slot relative to today (may be in the future).
create or replace function rookie_seed.slot(p_day_offset int, p_hours numeric)
returns timestamptz language sql stable as $$
  select date_trunc('day', now()) + make_interval(days => p_day_offset) + p_hours * interval '1 hour'
$$;

-- ---------------------------------------------------------------------------
-- 1. Users (auth.users + auth.identities → profiles via on_auth_user_created)
-- ---------------------------------------------------------------------------
drop table if exists rookie_seed.users;
create table rookie_seed.users (
  id uuid primary key, email text, full_name text, role public.user_role, joined_days_ago int,
  username text, bio text, goal public.learning_goal, experience public.experience_level, interests text[]
);

insert into rookie_seed.users values
  ('11111111-0000-4000-8000-000000000001', 'admin@rookie.dev', 'Ada Admin', 'admin', 84,
   'ada', 'Runs the Rookie platform. Ask me about anything that is not working.', null, null, '{}'),
  ('11111111-0000-4000-8000-000000000002', 'instructor@rookie.dev', 'Linus Mentor', 'instructor', 82,
   'linus', 'Backend engineer for 12 years. Teaches Java, OOP, operating systems and backend.', null, null, '{java,backend,linux}'),
  ('11111111-0000-4000-8000-000000000003', 'instructor2@rookie.dev', 'Grace Hopper-Lee', 'instructor', 80,
   'grace', 'Former compiler engineer. Teaches DSA, databases, networks, frontend and system design.', null, null, '{dsa,databases,distributed-systems}'),
  ('11111111-0000-4000-8000-000000000010', 'student@rookie.dev', 'Vaiju', 'student', 42,
   'vaiju', 'Aspiring full stack developer. Currently deep in Java and DSA.', 'full_stack_developer', 'beginner', '{java,web,dsa}'),
  ('11111111-0000-4000-8000-000000000011', 'priya@rookie.dev', 'Priya Sharma', 'student', 70,
   'priya', 'Career switcher from QA. Loves clean code.', 'full_stack_developer', 'some_experience', '{java,react}'),
  ('11111111-0000-4000-8000-000000000012', 'arjun@rookie.dev', 'Arjun Mehta', 'student', 63,
   'arjun', 'Building APIs and learning how databases really work.', 'backend_developer', 'some_experience', '{backend,sql}'),
  ('11111111-0000-4000-8000-000000000013', 'sofia@rookie.dev', 'Sofia Martinez', 'student', 56,
   'sofia', 'Designer turned frontend developer.', 'frontend_developer', 'beginner', '{css,react,ux}'),
  ('11111111-0000-4000-8000-000000000014', 'kenji@rookie.dev', 'Kenji Tanaka', 'student', 49,
   'kenji', 'CS student filling in the fundamentals.', 'cs_fundamentals', 'intermediate', '{os,networks}'),
  ('11111111-0000-4000-8000-000000000015', 'amara@rookie.dev', 'Amara Okafor', 'student', 35,
   'amara', 'Learning to build products end to end.', 'full_stack_developer', 'beginner', '{web,java}'),
  ('11111111-0000-4000-8000-000000000016', 'liam@rookie.dev', 'Liam O''Brien', 'student', 28,
   'liam', 'Self-taught, preparing for software engineering interviews.', 'software_developer', 'some_experience', '{dsa,java}'),
  ('11111111-0000-4000-8000-000000000017', 'zara@rookie.dev', 'Zara Ahmed', 'student', 18,
   'zara', 'Analyst moving into data engineering.', 'data_engineer', 'some_experience', '{sql,python,data}'),
  ('11111111-0000-4000-8000-000000000018', 'diego@rookie.dev', 'Diego Fernández', 'student', 8,
   'diego', 'Excited about AI engineering. Starting with the fundamentals.', 'ai_engineer', 'beginner', '{python,ai}');

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, last_sign_in_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  email_change_token_current, reauthentication_token
)
select '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email,
       extensions.crypt('Rookie@2026', extensions.gen_salt('bf')),
       now() - make_interval(days => u.joined_days_ago), now() - interval '1 hour',
       '{"provider":"email","providers":["email"]}'::jsonb,
       jsonb_build_object('full_name', u.full_name),
       now() - make_interval(days => u.joined_days_ago), now(),
       '', '', '', '', '', ''
from rookie_seed.users u;

insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select u.id, u.id, u.id::text,
       jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true, 'phone_verified', false),
       'email', now() - interval '1 hour',
       now() - make_interval(days => u.joined_days_ago), now()
from rookie_seed.users u;

-- The trigger created the profiles; fill in roles and onboarding answers.
update public.profiles p
   set role = u.role,
       username = u.username,
       bio = u.bio,
       learning_goal = u.goal,
       experience = u.experience,
       interests = u.interests,
       timezone = 'UTC',
       onboarded_at = case when u.role = 'student' then now() - make_interval(days => u.joined_days_ago) + interval '15 minutes' end,
       created_at = now() - make_interval(days => u.joined_days_ago)
  from rookie_seed.users u
 where p.id = u.id;

-- ---------------------------------------------------------------------------
-- 2. Courses & modules
-- ---------------------------------------------------------------------------
insert into public.courses (id, slug, title, summary, description, category, difficulty, estimated_hours, icon, instructor_id, is_published, position, created_at) values
  ('22222222-0000-4000-8000-000000000001', 'java-fundamentals', 'Java Fundamentals',
   'Write your first real programs: variables, control flow, arrays, methods and objects.',
   $md$Java is one of the most widely used languages in industry — it powers Android apps, banking systems and huge backend platforms. This course takes you from **zero to writing small, well-structured programs**.

You will learn how a Java program is compiled and run, how to store data in variables, make decisions, repeat work with loops, organise code into methods and model the world with classes and objects. Every lesson ends with a hands-on exercise.$md$,
   'programming', 'beginner', 20, '☕', '11111111-0000-4000-8000-000000000002', true, 1, now() - interval '80 days'),
  ('22222222-0000-4000-8000-000000000002', 'data-structures-algorithms', 'Data Structures & Algorithms',
   'The core toolkit for problem solving and technical interviews.',
   $md$Learn how data is organised in memory and how to reason about the cost of an algorithm with **Big-O notation**. We cover arrays, strings, linked lists, stacks, queues, trees and graphs, then the classic sorting and searching algorithms.

Each topic pairs a lesson with practice problems in the coding playground.$md$,
   'dsa', 'intermediate', 40, '🧮', '11111111-0000-4000-8000-000000000003', true, 2, now() - interval '79 days'),
  ('22222222-0000-4000-8000-000000000003', 'dbms', 'Database Management Systems',
   'Relational modelling, SQL, normalisation, transactions and indexes.',
   $md$Almost every application stores data in a database. This course explains the **relational model**, how to design schemas, how to query them with **SQL**, and what a database does behind the scenes to keep your data correct (transactions) and fast (indexes).$md$,
   'cs-core', 'beginner', 18, '🗄️', '11111111-0000-4000-8000-000000000003', true, 3, now() - interval '78 days'),
  ('22222222-0000-4000-8000-000000000004', 'operating-systems', 'Operating Systems',
   'Processes, threads, scheduling, synchronisation and memory.',
   $md$What actually happens when you run a program? This course covers **processes and threads**, CPU scheduling, race conditions and locks, deadlocks, and how virtual memory gives every process the illusion of its own address space.$md$,
   'cs-core', 'intermediate', 20, '🖥️', '11111111-0000-4000-8000-000000000002', true, 4, now() - interval '77 days'),
  ('22222222-0000-4000-8000-000000000005', 'computer-networks', 'Computer Networks',
   'How data moves across the internet: layers, IP, TCP/UDP, DNS and HTTP.',
   $md$Follow a request from your browser to a server and back. You will learn the **TCP/IP model**, IP addressing and subnetting, the difference between TCP and UDP, how DNS resolves names and how HTTP(S) works.$md$,
   'cs-core', 'intermediate', 16, '🌐', '11111111-0000-4000-8000-000000000003', true, 5, now() - interval '76 days'),
  ('22222222-0000-4000-8000-000000000006', 'object-oriented-programming', 'Object Oriented Programming',
   'Encapsulation, inheritance, polymorphism, abstraction and SOLID design.',
   $md$Go beyond syntax and learn to **design** programs. We cover the four pillars of OOP, interfaces vs abstract classes, the SOLID principles and a handful of design patterns you will meet in every codebase. Examples are in Java.$md$,
   'programming', 'beginner', 14, '🧩', '11111111-0000-4000-8000-000000000002', true, 6, now() - interval '75 days'),
  ('22222222-0000-4000-8000-000000000007', 'backend-development', 'Backend Development',
   'Build and ship HTTP APIs: REST, Node.js/Express, auth, databases and caching.',
   $md$Learn to build the server side of web applications: design **REST APIs**, implement them with Node.js and Express, authenticate users, persist data, cache hot paths and deploy with confidence.$md$,
   'web-development', 'intermediate', 30, '⚙️', '11111111-0000-4000-8000-000000000002', true, 7, now() - interval '74 days'),
  ('22222222-0000-4000-8000-000000000008', 'frontend-development', 'Frontend Development',
   'Semantic HTML, modern CSS layout, the DOM and React.',
   $md$Build accessible, responsive user interfaces. Starting from **semantic HTML** and **Flexbox/Grid**, you will move on to JavaScript and the DOM, then build component-based UIs with **React** hooks and data fetching.$md$,
   'web-development', 'beginner', 28, '🎨', '11111111-0000-4000-8000-000000000003', true, 8, now() - interval '73 days'),
  ('22222222-0000-4000-8000-000000000009', 'system-design', 'System Design',
   'Design scalable systems: load balancing, caching, sharding and queues.',
   $md$Learn the vocabulary and trade-offs of large-scale systems. We cover **horizontal scaling**, load balancers, caching strategies, database replication and sharding, and asynchronous processing with message queues — then put it together by designing a URL shortener.$md$,
   'architecture', 'advanced', 24, '🏗️', '11111111-0000-4000-8000-000000000003', true, 9, now() - interval '72 days');

insert into public.course_modules (id, course_id, title, description, position) values
  -- Java
  ('33333333-0001-4000-8000-000000000001', '22222222-0000-4000-8000-000000000001', 'Getting Started', 'The JVM, variables, types and operators.', 1),
  ('33333333-0001-4000-8000-000000000002', '22222222-0000-4000-8000-000000000001', 'Control Flow', 'Making decisions and repeating work.', 2),
  ('33333333-0001-4000-8000-000000000003', '22222222-0000-4000-8000-000000000001', 'Arrays, Methods & Objects', 'Structuring data and code.', 3),
  -- DSA
  ('33333333-0002-4000-8000-000000000001', '22222222-0000-4000-8000-000000000002', 'Linear Data Structures', 'Arrays, strings, linked lists, stacks and queues.', 1),
  ('33333333-0002-4000-8000-000000000002', '22222222-0000-4000-8000-000000000002', 'Trees & Graphs', 'Hierarchical and networked data.', 2),
  ('33333333-0002-4000-8000-000000000003', '22222222-0000-4000-8000-000000000002', 'Sorting & Searching', 'Classic algorithms and their complexity.', 3),
  -- DBMS
  ('33333333-0003-4000-8000-000000000001', '22222222-0000-4000-8000-000000000003', 'The Relational Model', 'Tables, keys and ER modelling.', 1),
  ('33333333-0003-4000-8000-000000000002', '22222222-0000-4000-8000-000000000003', 'SQL & Schema Design', 'Querying and normalising data.', 2),
  ('33333333-0003-4000-8000-000000000003', '22222222-0000-4000-8000-000000000003', 'Inside the Database', 'Transactions and indexes.', 3),
  -- OS
  ('33333333-0004-4000-8000-000000000001', '22222222-0000-4000-8000-000000000004', 'Processes & Scheduling', 'What runs, and when.', 1),
  ('33333333-0004-4000-8000-000000000002', '22222222-0000-4000-8000-000000000004', 'Concurrency & Memory', 'Locks, deadlocks and virtual memory.', 2),
  -- Networks
  ('33333333-0005-4000-8000-000000000001', '22222222-0000-4000-8000-000000000005', 'Network Foundations', 'Layers and addressing.', 1),
  ('33333333-0005-4000-8000-000000000002', '22222222-0000-4000-8000-000000000005', 'Transport & Application', 'TCP, UDP, DNS and HTTP.', 2),
  -- OOP
  ('33333333-0006-4000-8000-000000000001', '22222222-0000-4000-8000-000000000006', 'The Four Pillars', 'Encapsulation, inheritance, polymorphism, abstraction.', 1),
  ('33333333-0006-4000-8000-000000000002', '22222222-0000-4000-8000-000000000006', 'Designing with Objects', 'SOLID and design patterns.', 2),
  -- Backend
  ('33333333-0007-4000-8000-000000000001', '22222222-0000-4000-8000-000000000007', 'Building APIs', 'REST, Express and authentication.', 1),
  ('33333333-0007-4000-8000-000000000002', '22222222-0000-4000-8000-000000000007', 'Data & Production', 'Databases, caching, testing and deployment.', 2),
  -- Frontend
  ('33333333-0008-4000-8000-000000000001', '22222222-0000-4000-8000-000000000008', 'Web Foundations', 'HTML, CSS and the DOM.', 1),
  ('33333333-0008-4000-8000-000000000002', '22222222-0000-4000-8000-000000000008', 'React', 'Components, state and data fetching.', 2),
  -- System design
  ('33333333-0009-4000-8000-000000000001', '22222222-0000-4000-8000-000000000009', 'Scaling Fundamentals', 'Scalability, load balancing and caching.', 1),
  ('33333333-0009-4000-8000-000000000002', '22222222-0000-4000-8000-000000000009', 'Data at Scale', 'Replication, sharding, queues and a case study.', 2);

-- ---------------------------------------------------------------------------
-- 3. Lessons — Java Fundamentals
-- (course_id is also filled by the lessons_sync_course trigger)
-- ---------------------------------------------------------------------------
insert into public.lessons (id, module_id, course_id, slug, title, summary, estimated_minutes, position, content, exercise) values
('44444444-0001-4000-8000-000000000001', '33333333-0001-4000-8000-000000000001', '22222222-0000-4000-8000-000000000001',
 'introduction-to-java', 'Introduction to Java', 'How Java code becomes a running program, and your first Hello World.', 20, 1,
$md$# Introduction to Java

Java is a **statically typed, object-oriented** language created at Sun Microsystems in 1995. Its famous promise is *"write once, run anywhere"*: the same compiled program runs on Windows, macOS and Linux.

## How a Java program runs

1. You write source code in a `.java` file.
2. The compiler `javac` turns it into **bytecode** (a `.class` file).
3. The **Java Virtual Machine (JVM)** loads the bytecode and executes it, compiling hot code paths to native machine code at runtime (JIT compilation).

```text
Hello.java  --javac-->  Hello.class  --java (JVM)-->  output
```

The **JDK** (Java Development Kit) contains the compiler and tools; the **JRE/JVM** is what actually runs programs.

## Your first program

```java
public class Hello {
    public static void main(String[] args) {
        System.out.println("Hello, Rookie!");
    }
}
```

Line by line:

- `public class Hello` — every piece of Java code lives inside a class. The file must be named `Hello.java`.
- `public static void main(String[] args)` — the **entry point**. The JVM looks for exactly this signature.
- `System.out.println(...)` — prints a line to standard output.
- Statements end with a semicolon `;` and blocks are wrapped in `{ }`.

Compile and run it from a terminal:

```bash
javac Hello.java
java Hello
```

Since Java 11 you can also run a single file directly with `java Hello.java`.

## Comments

```java
// single-line comment
/* multi-line
   comment */
```

## Key takeaways

- Java source compiles to bytecode, which runs on the JVM.
- Execution starts at `main`.
- Java is case-sensitive: `System` and `system` are different names.$md$,
$md$## Exercise

1. Install JDK 21 and verify it with `java -version`.
2. Write a program `AboutMe.java` that prints three lines: your name, your city and why you want to learn programming.
3. Deliberately remove a semicolon and read the compiler error. What line does it point to?$md$),

('44444444-0001-4000-8000-000000000002', '33333333-0001-4000-8000-000000000001', '22222222-0000-4000-8000-000000000001',
 'variables', 'Variables', 'Declaring, initialising and naming variables; final and var.', 20, 2,
$md$# Variables

A **variable** is a named box in memory that holds a value. In Java every variable has a **type** that is fixed at compile time.

## Declaring and initialising

```java
int age;            // declaration
age = 21;           // assignment
int year = 2026;    // declaration + initialisation
String name = "Vaiju";
```

Local variables **must be assigned before they are read** — the compiler rejects code that might read an uninitialised local:

```java
int score;
System.out.println(score); // error: variable score might not have been initialized
```

## Reassignment

```java
int lives = 3;
lives = lives - 1;  // lives is now 2
```

## Constants with `final`

```java
final double PI = 3.14159;
PI = 3; // compile error: cannot assign a value to final variable PI
```

By convention constants are written in `UPPER_SNAKE_CASE`.

## Type inference with `var`

Since Java 10, local variables can use `var` when the type is obvious from the right-hand side:

```java
var count = 10;          // int
var message = "hi";      // String
```

The variable is still statically typed — `var` only saves typing. You cannot write `var x;` without an initialiser.

## Naming rules

- Must start with a letter, `_` or `$`; cannot start with a digit.
- Cannot be a keyword (`class`, `int`, `for`, ...).
- Use **camelCase** for variables: `totalPrice`, `isLoggedIn`.

## Scope

A variable exists only inside the block `{ }` where it is declared:

```java
if (true) {
    int inside = 5;
}
System.out.println(inside); // error: cannot find symbol
```

## Key takeaways

- Every variable has a fixed type.
- Locals must be initialised before use.
- `final` makes a variable unchangeable; `var` infers the type.$md$,
$md$## Exercise

Write a program that declares variables for a product's `name`, `price` and `quantity`, computes the `total`, and prints a receipt line like `3 x Notebook = 135.0`. Make the tax rate a `final` constant and add it to the total.$md$),

('44444444-0001-4000-8000-000000000003', '33333333-0001-4000-8000-000000000001', '22222222-0000-4000-8000-000000000001',
 'data-types', 'Data Types', 'The eight primitive types, String, and type conversion.', 25, 3,
$md$# Data Types

Java has two families of types: **primitive types** that hold raw values, and **reference types** that point to objects.

## The eight primitives

| Type | Size | Example | Range / notes |
|------|------|---------|---------------|
| `byte` | 8 bit | `byte b = 100;` | -128 to 127 |
| `short` | 16 bit | `short s = 30000;` | -32,768 to 32,767 |
| `int` | 32 bit | `int n = 42;` | about ±2.1 billion |
| `long` | 64 bit | `long big = 9_000_000_000L;` | note the `L` suffix |
| `float` | 32 bit | `float f = 3.14f;` | note the `f` suffix |
| `double` | 64 bit | `double d = 3.14;` | default for decimals |
| `char` | 16 bit | `char c = 'A';` | a single UTF-16 unit |
| `boolean` | — | `boolean ok = true;` | `true` or `false` |

## Reference types

`String`, arrays and every class you write are reference types. The variable stores a *reference* to an object on the heap, and it can be `null`.

```java
String greeting = "Hello";
String nothing = null;
```

## Type conversion

**Widening** (small → large) happens automatically:

```java
int i = 10;
long l = i;      // fine
double d = i;    // 10.0
```

**Narrowing** needs an explicit **cast** and can lose information:

```java
double price = 9.99;
int whole = (int) price;   // 9 — the fraction is truncated
int big = 130;
byte small = (byte) big;   // -126 — overflow wraps around
```

## Integer overflow

```java
int max = Integer.MAX_VALUE;   // 2147483647
System.out.println(max + 1);   // -2147483648
```

Use `long` when values can exceed about two billion.

## Floating-point precision

```java
System.out.println(0.1 + 0.2); // 0.30000000000000004
```

For money, use `java.math.BigDecimal` or store amounts in the smallest unit (cents) as `long`.

## Key takeaways

- Primitives hold values; reference types hold references.
- Widening is automatic, narrowing needs a cast.
- Watch out for overflow and floating-point rounding.$md$,
$md$## Exercise

1. Print `Integer.MAX_VALUE`, `Long.MAX_VALUE` and `Double.MAX_VALUE`.
2. Store `7 / 2` in an `int` and `7 / 2.0` in a `double`. Print both and explain the difference.
3. Cast the `char` `'A'` to an `int`. What number do you get, and why?$md$),

('44444444-0001-4000-8000-000000000004', '33333333-0001-4000-8000-000000000001', '22222222-0000-4000-8000-000000000001',
 'operators', 'Operators', 'Arithmetic, comparison, logical and assignment operators, and precedence.', 20, 4,
$md$# Operators

Operators combine values into **expressions**.

## Arithmetic

```java
int a = 17, b = 5;
a + b   // 22
a - b   // 12
a * b   // 85
a / b   // 3   — integer division truncates toward zero
a % b   // 2   — remainder
17.0 / 5 // 3.4 — if either side is a double, the result is a double
```

`%` is handy for "every n-th" logic: `n % 2 == 0` tests for even numbers.

## Increment and decrement

```java
int x = 5;
int y = x++;  // y = 5, x = 6  (post-increment: use, then add)
int z = ++x;  // z = 7, x = 7  (pre-increment: add, then use)
```

## Compound assignment

```java
int total = 10;
total += 5;   // total = total + 5  → 15
total *= 2;   // 30
total %= 7;   // 2
```

## Comparison

`==`, `!=`, `<`, `<=`, `>`, `>=` all produce a `boolean`.

> For objects such as `String`, `==` compares **references**, not contents. Use `.equals()`:
>
> ```java
> String a = new String("hi");
> a == "hi"        // false
> a.equals("hi")   // true
> ```

## Logical operators

```java
boolean adult = age >= 18;
boolean member = true;
adult && member   // AND
adult || member   // OR
!adult            // NOT
```

`&&` and `||` **short-circuit**: the right side is evaluated only if needed. This makes `s != null && s.length() > 0` safe.

## Precedence

From high to low (simplified): `++ --` → `* / %` → `+ -` → comparisons → `==` → `&&` → `||` → `=`.

```java
int r = 2 + 3 * 4;      // 14, not 20
int s = (2 + 3) * 4;    // 20
```

When in doubt, add parentheses — they make intent obvious to readers.

## The ternary operator

```java
String label = score >= 50 ? "pass" : "fail";
```

## Key takeaways

- Integer division truncates; `%` gives the remainder.
- Use `.equals()` for strings.
- `&&`/`||` short-circuit.$md$,
$md$## Exercise

Write a program that reads a number of seconds (hard-code it, e.g. `98765`) and prints it as `hours:minutes:seconds` using only `/` and `%`. Then use the ternary operator to print whether the number of hours is even or odd.$md$),

('44444444-0001-4000-8000-000000000005', '33333333-0001-4000-8000-000000000002', '22222222-0000-4000-8000-000000000001',
 'conditions', 'Conditions', 'Branching with if, else if and else; guard clauses.', 20, 5,
$md$# Conditions

Programs become useful when they can make decisions. Java's main tool is the `if` statement.

## if / else

```java
int temperature = 31;

if (temperature > 30) {
    System.out.println("It's hot — drink water.");
} else {
    System.out.println("Nice weather.");
}
```

The condition must be a `boolean`. Unlike C or JavaScript, `if (1)` does **not** compile in Java.

## else if chains

Conditions are checked top to bottom; the **first** true branch runs and the rest are skipped.

```java
int score = 78;
char grade;

if (score >= 90) {
    grade = 'A';
} else if (score >= 75) {
    grade = 'B';
} else if (score >= 60) {
    grade = 'C';
} else {
    grade = 'F';
}
System.out.println("Grade: " + grade); // Grade: B
```

Order matters: if `score >= 60` came first, a 95 would get a `C`.

## Combining conditions

```java
boolean isWeekend = true;
boolean isRaining = false;

if (isWeekend && !isRaining) {
    System.out.println("Go for a hike!");
}
```

## Nested conditions and guard clauses

Deep nesting is hard to read:

```java
if (user != null) {
    if (user.isActive()) {
        if (user.hasPaid()) {
            grantAccess(user);
        }
    }
}
```

Prefer **guard clauses** that exit early:

```java
if (user == null) return;
if (!user.isActive()) return;
if (!user.hasPaid()) return;
grantAccess(user);
```

## Always use braces

Java allows omitting braces for single statements, but it is a classic source of bugs:

```java
if (loggedIn)
    showDashboard();
    logVisit();      // runs ALWAYS — indentation lies!
```

## Key takeaways

- Conditions must be `boolean` expressions.
- In an `else if` chain only the first matching branch runs.
- Guard clauses keep code flat and readable.$md$,
$md$## Exercise

Write a program that takes a `year` and prints whether it is a **leap year**. Rules: divisible by 4, except years divisible by 100, unless also divisible by 400. Test with 1900 (no), 2000 (yes), 2024 (yes) and 2026 (no).$md$),

('44444444-0001-4000-8000-000000000006', '33333333-0001-4000-8000-000000000002', '22222222-0000-4000-8000-000000000001',
 'switch', 'Switch', 'Classic switch statements, fall-through and modern switch expressions.', 20, 6,
$md$# Switch

When you compare **one value against many constants**, `switch` is often clearer than a long `else if` chain.

## The classic switch statement

```java
int day = 3;
String name;

switch (day) {
    case 1:
        name = "Monday";
        break;
    case 2:
        name = "Tuesday";
        break;
    case 3:
        name = "Wednesday";
        break;
    default:
        name = "Unknown";
}
```

`switch` works with `int`-like primitives (`byte`, `short`, `char`, `int`), their wrappers, `String` and `enum` values.

## Fall-through

Without `break`, execution **falls through** into the next case:

```java
switch (month) {
    case 12:
    case 1:
    case 2:
        System.out.println("Winter");
        break;
    case 6:
    case 7:
    case 8:
        System.out.println("Summer");
        break;
}
```

Grouping like this is intentional. Forgetting a `break` by accident is a very common bug.

## Switch expressions (Java 14+)

Modern Java has an arrow form that **never falls through** and can return a value:

```java
String name = switch (day) {
    case 1 -> "Monday";
    case 2 -> "Tuesday";
    case 3 -> "Wednesday";
    case 6, 7 -> "Weekend";
    default -> "Unknown";
};
```

If a case needs several statements, use a block and `yield`:

```java
int points = switch (grade) {
    case 'A' -> 10;
    case 'B' -> 8;
    default -> {
        System.out.println("Needs improvement");
        yield 5;
    }
};
```

A switch **expression** must be exhaustive — every possible value needs a result, usually via `default`.

## Switch on strings

```java
switch (command) {
    case "start" -> startServer();
    case "stop"  -> stopServer();
    default      -> System.out.println("Unknown command: " + command);
}
```

String matching is case-sensitive and throws `NullPointerException` if `command` is `null`.

## Key takeaways

- Use `switch` for one value vs. many constants.
- Classic `case:` labels fall through without `break`.
- Prefer arrow-style switch expressions in modern Java.$md$,
$md$## Exercise

Build a tiny calculator: given `double a`, `double b` and `char op` (`'+'`, `'-'`, `'*'`, `'/'`), compute the result with a **switch expression**. For division by zero or an unknown operator, print an error message instead.$md$),

('44444444-0001-4000-8000-000000000007', '33333333-0001-4000-8000-000000000002', '22222222-0000-4000-8000-000000000001',
 'loops', 'Loops', 'for, while, do-while, enhanced for, break and continue.', 25, 7,
$md$# Loops

Loops repeat a block of code. Java has four kinds.

## for

Use `for` when you know how many times to repeat:

```java
for (int i = 1; i <= 5; i++) {
    System.out.println("Step " + i);
}
```

The header has three parts: **initialisation**, **condition** (checked before each iteration) and **update** (run after each iteration).

## while

Use `while` when you repeat until something happens:

```java
int n = 1;
while (n < 1000) {
    n *= 2;
}
System.out.println(n); // 1024
```

## do-while

The body runs **at least once**, because the condition is checked afterwards:

```java
int attempts = 0;
do {
    attempts++;
    System.out.println("Trying to connect... #" + attempts);
} while (attempts < 3);
```

## Enhanced for (for-each)

The cleanest way to visit every element of an array or collection:

```java
int[] marks = {72, 85, 91, 64};
int sum = 0;
for (int m : marks) {
    sum += m;
}
System.out.println("Average: " + (sum / (double) marks.length));
```

## break and continue

```java
for (int i = 1; i <= 10; i++) {
    if (i % 2 == 0) continue;   // skip even numbers
    if (i > 7) break;           // stop the loop entirely
    System.out.print(i + " ");  // 1 3 5 7
}
```

## Nested loops

```java
for (int row = 1; row <= 3; row++) {
    for (int col = 1; col <= row; col++) {
        System.out.print("*");
    }
    System.out.println();
}
// *
// **
// ***
```

## Common bugs

- **Off-by-one:** `i <= arr.length` reads past the end — use `i < arr.length`.
- **Infinite loops:** forgetting to update the loop variable in a `while`.

## Key takeaways

- `for` for counted loops, `while` for condition-driven loops, `do-while` when the body must run once.
- Prefer for-each when you don't need the index.$md$,
$md$## Exercise

1. Print the multiplication table of 7 (7 x 1 … 7 x 10).
2. Print all numbers from 1 to 50 that are divisible by 3 but not by 5.
3. **Challenge:** using a `while` loop, compute the sum of the digits of `98765` (answer: 35).$md$),

('44444444-0001-4000-8000-000000000008', '33333333-0001-4000-8000-000000000003', '22222222-0000-4000-8000-000000000001',
 'arrays', 'Arrays', 'Fixed-size indexed collections, iteration, 2D arrays and java.util.Arrays.', 25, 8,
$md$# Arrays

An **array** stores a fixed number of values of the same type in contiguous memory, accessed by a zero-based **index**.

## Creating arrays

```java
int[] scores = new int[5];             // [0, 0, 0, 0, 0] — default values
String[] names = {"Ada", "Linus", "Grace"};
double[] prices = new double[]{9.99, 4.5};
```

Default values: `0` for numbers, `false` for booleans, `null` for references.

## Reading and writing

```java
scores[0] = 90;
scores[4] = 75;
System.out.println(scores.length);  // 5 — a field, not a method
System.out.println(scores[5]);      // ArrayIndexOutOfBoundsException
```

Valid indexes run from `0` to `length - 1`. The size **cannot change** after creation — use `ArrayList` when you need a growable list.

## Iterating

```java
int max = scores[0];
for (int i = 1; i < scores.length; i++) {
    if (scores[i] > max) {
        max = scores[i];
    }
}
```

Use a for-each loop when you don't need the index:

```java
for (String n : names) {
    System.out.println("Hello, " + n);
}
```

## Arrays are references

```java
int[] a = {1, 2, 3};
int[] b = a;     // b points to the SAME array
b[0] = 99;
System.out.println(a[0]); // 99
```

To copy, use `Arrays.copyOf(a, a.length)` or `a.clone()`.

## Useful helpers in java.util.Arrays

```java
import java.util.Arrays;

int[] nums = {5, 2, 9, 1};
Arrays.sort(nums);                         // [1, 2, 5, 9]
System.out.println(Arrays.toString(nums)); // "[1, 2, 5, 9]"
int idx = Arrays.binarySearch(nums, 5);    // 2 (array must be sorted)
Arrays.fill(nums, 0);                      // [0, 0, 0, 0]
```

Printing an array directly (`System.out.println(nums)`) shows something like `[I@1b6d3586` — use `Arrays.toString`.

## 2D arrays

```java
int[][] grid = {
    {1, 2, 3},
    {4, 5, 6}
};
System.out.println(grid[1][2]);   // 6
System.out.println(grid.length);  // 2 rows
System.out.println(grid[0].length); // 3 columns
```

## Key takeaways

- Arrays have a fixed length and zero-based indexes.
- Array variables hold references; assignment does not copy.
- `java.util.Arrays` has sort, search, copy and toString helpers.$md$,
$md$## Exercise

Given `int[] nums = {4, 8, 15, 16, 23, 42}`:

1. Print the sum and the average.
2. Reverse the array **in place** (swap from both ends) and print it with `Arrays.toString`.
3. Count how many elements are even.$md$),

('44444444-0001-4000-8000-000000000009', '33333333-0001-4000-8000-000000000003', '22222222-0000-4000-8000-000000000001',
 'methods', 'Methods', 'Defining methods, parameters, return values, overloading and pass-by-value.', 25, 9,
$md$# Methods

A **method** is a named, reusable block of code. Methods let you break a problem into small, testable pieces.

## Anatomy of a method

```java
public static int add(int a, int b) {
    return a + b;
}
```

- `public` — access modifier (who can call it).
- `static` — belongs to the class, so `main` can call it without an object.
- `int` — the **return type** (`void` if nothing is returned).
- `add` — the name, in camelCase, usually a verb.
- `(int a, int b)` — **parameters**.

Calling it:

```java
int sum = add(3, 4); // 7
```

## void methods

```java
static void greet(String name) {
    System.out.println("Hi, " + name + "!");
}
```

## Return early

```java
static boolean isPrime(int n) {
    if (n < 2) return false;
    for (int i = 2; (long) i * i <= n; i++) {
        if (n % i == 0) return false;
    }
    return true;
}
```

Every path of a non-void method must return a value, or the code won't compile.

## Overloading

Several methods can share a name if their **parameter lists differ**:

```java
static int max(int a, int b)          { return a > b ? a : b; }
static double max(double a, double b) { return a > b ? a : b; }
static int max(int a, int b, int c)   { return max(max(a, b), c); }
```

## Java is pass-by-value

The method receives a **copy** of each argument:

```java
static void tryToChange(int x) { x = 100; }

int n = 5;
tryToChange(n);
System.out.println(n); // 5
```

For objects and arrays, the copied value is the *reference*, so the method can modify the object's contents — but cannot make the caller's variable point somewhere else:

```java
static void fillFirst(int[] arr) { arr[0] = 42; }

int[] data = {1, 2, 3};
fillFirst(data);
System.out.println(data[0]); // 42
```

## Recursion

A method may call itself. Always include a **base case**:

```java
static long factorial(int n) {
    if (n <= 1) return 1;          // base case
    return n * factorial(n - 1);   // recursive case
}
```

## Key takeaways

- Methods have a return type, a name and parameters.
- Overloading = same name, different parameters.
- Java always passes copies; for objects the copy is a reference.$md$,
$md$## Exercise

Write and test these methods:

1. `static int countVowels(String s)`
2. `static boolean isPalindrome(String s)` — ignore case.
3. `static int[] minMax(int[] nums)` returning `{min, max}`.
4. **Challenge:** a recursive `static int fib(int n)`. Why does `fib(45)` take so long?$md$),

('44444444-0001-4000-8000-000000000010', '33333333-0001-4000-8000-000000000003', '22222222-0000-4000-8000-000000000001',
 'oop-basics', 'OOP Basics', 'Classes, objects, fields, constructors, this and encapsulation.', 30, 10,
$md$# OOP Basics

**Object-oriented programming** organises code around *objects* that bundle **state** (fields) with **behaviour** (methods). A **class** is the blueprint; an **object** is an instance built from it.

## Defining a class

```java
public class BankAccount {
    // fields (state)
    private final String owner;
    private double balance;

    // constructor
    public BankAccount(String owner, double openingBalance) {
        this.owner = owner;
        this.balance = openingBalance;
    }

    // methods (behaviour)
    public void deposit(double amount) {
        if (amount <= 0) {
            throw new IllegalArgumentException("Deposit must be positive");
        }
        balance += amount;
    }

    public boolean withdraw(double amount) {
        if (amount > balance) return false;
        balance -= amount;
        return true;
    }

    public double getBalance() {
        return balance;
    }

    @Override
    public String toString() {
        return owner + ": " + balance;
    }
}
```

## Creating and using objects

```java
BankAccount acc = new BankAccount("Vaiju", 500);
acc.deposit(250);
acc.withdraw(100);
System.out.println(acc.getBalance()); // 650.0
System.out.println(acc);              // Vaiju: 650.0
```

`new` allocates the object on the heap and runs the **constructor**.

## `this`

Inside a method or constructor, `this` refers to the current object. It disambiguates a field from a parameter with the same name: `this.owner = owner;`.

## Encapsulation

The fields are `private`, so outside code **cannot** do `acc.balance = 1_000_000;`. All changes go through methods that enforce the rules (no negative deposits, no overdrafts). This is **encapsulation** — the object protects its own invariants.

## Static vs instance members

```java
public class Counter {
    static int created = 0;   // shared by all Counter objects
    int value = 0;            // one per object

    Counter() { created++; }
}
```

## The four pillars (preview)

1. **Encapsulation** — hide state behind methods.
2. **Inheritance** — build a class from an existing one (`extends`).
3. **Polymorphism** — one interface, many implementations.
4. **Abstraction** — expose *what* an object does, not *how*.

The Object Oriented Programming course covers each in depth.

## Key takeaways

- A class is a blueprint; objects are instances created with `new`.
- Constructors initialise state; `this` refers to the current object.
- Keep fields `private` and expose behaviour through methods.$md$,
$md$## Exercise

Create a `Student` class with private fields `name` and `int[] marks`, a constructor, a method `double average()` and a method `char grade()` (A ≥ 90, B ≥ 75, C ≥ 60, else F). In `main`, create three students and print each one's name, average and grade.$md$);

-- ---------------------------------------------------------------------------
-- 3b. Lessons — Data Structures & Algorithms
-- ---------------------------------------------------------------------------
insert into public.lessons (id, module_id, course_id, slug, title, summary, estimated_minutes, position, content, exercise) values
('44444444-0002-4000-8000-000000000001', '33333333-0002-4000-8000-000000000001', '22222222-0000-4000-8000-000000000002',
 'arrays', 'Arrays', 'Contiguous memory, Big-O of array operations and the two-pointer technique.', 30, 1,
$md$# Arrays

An array stores elements in **contiguous memory**. Because every element has the same size, the address of `arr[i]` is `base + i * size`, so reading any index is **O(1)**.

## Cost of common operations

| Operation | Time |
|-----------|------|
| Access `arr[i]` | O(1) |
| Search unsorted | O(n) |
| Insert/delete at end (dynamic array) | O(1) amortised |
| Insert/delete in the middle | O(n) — elements must shift |

Dynamic arrays (`ArrayList` in Java, `list` in Python, JS arrays) double their capacity when full, which is why appending is *amortised* O(1).

## Pattern 1 — running totals (prefix sums)

Answer "sum of `arr[l..r]`" queries in O(1) after O(n) preprocessing:

```java
int[] prefix = new int[nums.length + 1];
for (int i = 0; i < nums.length; i++) {
    prefix[i + 1] = prefix[i] + nums[i];
}
int rangeSum = prefix[r + 1] - prefix[l];
```

## Pattern 2 — two pointers

On a **sorted** array, find two numbers that add up to a target in O(n) instead of O(n²):

```java
int lo = 0, hi = nums.length - 1;
while (lo < hi) {
    int sum = nums[lo] + nums[hi];
    if (sum == target) return new int[]{lo, hi};
    if (sum < target) lo++;   // need a bigger sum
    else hi--;                // need a smaller sum
}
return new int[]{-1, -1};
```

## Pattern 3 — Kadane's algorithm

Maximum subarray sum in one pass: at each index, either extend the previous subarray or start fresh.

```java
int best = nums[0], current = nums[0];
for (int i = 1; i < nums.length; i++) {
    current = Math.max(nums[i], current + nums[i]);
    best = Math.max(best, current);
}
```

## Key takeaways

- Index access is O(1); inserting in the middle is O(n).
- Prefix sums, two pointers and Kadane's algorithm solve a huge family of array problems.$md$,
$md$## Practice

Solve **Two Sum**, **Best Time to Buy and Sell Stock** and **Maximum Subarray** in the Practice section. For each, write down the time and space complexity of your solution before submitting.$md$),

('44444444-0002-4000-8000-000000000002', '33333333-0002-4000-8000-000000000001', '22222222-0000-4000-8000-000000000002',
 'strings', 'Strings', 'Immutability, StringBuilder, character counting and sliding windows.', 30, 2,
$md$# Strings

A string is a sequence of characters. In Java (and JavaScript and Python) strings are **immutable** — every "modification" creates a new string.

## The hidden cost of concatenation

```java
String s = "";
for (int i = 0; i < n; i++) {
    s += i;           // copies the whole string every time → O(n²)
}
```

Use a `StringBuilder`, which appends in amortised O(1):

```java
StringBuilder sb = new StringBuilder();
for (int i = 0; i < n; i++) {
    sb.append(i);
}
String result = sb.toString();
```

## Character frequency counting

Many string problems reduce to counting characters. For lowercase English letters an `int[26]` is faster than a hash map:

```java
static boolean isAnagram(String s, String t) {
    if (s.length() != t.length()) return false;
    int[] count = new int[26];
    for (int i = 0; i < s.length(); i++) {
        count[s.charAt(i) - 'a']++;
        count[t.charAt(i) - 'a']--;
    }
    for (int c : count) if (c != 0) return false;
    return true;
}
```

## Two pointers on strings

Checking a palindrome from both ends uses O(1) extra space:

```java
static boolean isPalindrome(String s) {
    int i = 0, j = s.length() - 1;
    while (i < j) {
        if (s.charAt(i++) != s.charAt(j--)) return false;
    }
    return true;
}
```

## Sliding window

To find the **longest substring without repeating characters**, grow a window on the right and shrink it from the left whenever a duplicate appears. Each character enters and leaves the window at most once, so the whole scan is O(n).

## Useful API

`length()`, `charAt(i)`, `substring(a, b)` (end exclusive), `indexOf`, `split`, `trim`, `toLowerCase`, `equals` and `toCharArray()`.

## Key takeaways

- Strings are immutable: build them with `StringBuilder`.
- Frequency arrays, two pointers and sliding windows cover most string problems.$md$,
$md$## Practice

Solve **Valid Palindrome**, **Valid Anagram** and **Reverse Words in a String**. Bonus: implement "longest substring without repeating characters" with a sliding window.$md$),

('44444444-0002-4000-8000-000000000003', '33333333-0002-4000-8000-000000000001', '22222222-0000-4000-8000-000000000002',
 'linked-lists', 'Linked Lists', 'Nodes and pointers, reversal, fast/slow pointers and dummy heads.', 35, 3,
$md$# Linked Lists

A **linked list** is a chain of nodes where each node stores a value and a reference to the next node. Unlike arrays, nodes are scattered in memory.

```java
class ListNode {
    int val;
    ListNode next;
    ListNode(int val) { this.val = val; }
}
```

## Trade-offs vs arrays

| Operation | Array | Linked list |
|-----------|-------|-------------|
| Access i-th element | O(1) | O(n) |
| Insert/delete at head | O(n) | **O(1)** |
| Insert after a known node | O(n) | **O(1)** |
| Memory locality | great | poor |

## Reversing a list (the classic)

Walk the list once, flipping each `next` pointer:

```java
static ListNode reverse(ListNode head) {
    ListNode prev = null, curr = head;
    while (curr != null) {
        ListNode next = curr.next; // remember the rest
        curr.next = prev;          // flip the pointer
        prev = curr;               // advance prev
        curr = next;               // advance curr
    }
    return prev;                   // new head
}
```

O(n) time, O(1) space.

## Fast and slow pointers

Move `slow` one step and `fast` two steps. When `fast` reaches the end, `slow` is at the **middle**. If the list has a **cycle**, `fast` will eventually meet `slow` (Floyd's algorithm).

```java
static boolean hasCycle(ListNode head) {
    ListNode slow = head, fast = head;
    while (fast != null && fast.next != null) {
        slow = slow.next;
        fast = fast.next.next;
        if (slow == fast) return true;
    }
    return false;
}
```

## The dummy head trick

When the head itself might change (merging, deleting), start from a dummy node to avoid special cases:

```java
ListNode dummy = new ListNode(0);
ListNode tail = dummy;
// ... append nodes to tail.next ...
return dummy.next;
```

> In the Rookie playground, lists are passed as arrays (e.g. `[1,2,3]`) so you can focus on the algorithm.

## Key takeaways

- O(1) insertion at known positions, O(n) access.
- Master reversal, fast/slow pointers and dummy heads.$md$,
$md$## Practice

Solve **Reverse Linked List** and **Merge Two Sorted Lists**. Then, on paper, trace `reverse` on the list `1 → 2 → 3` and write down `prev` and `curr` after each iteration.$md$),

('44444444-0002-4000-8000-000000000004', '33333333-0002-4000-8000-000000000001', '22222222-0000-4000-8000-000000000002',
 'stacks', 'Stacks', 'LIFO, ArrayDeque, bracket matching and monotonic stacks.', 30, 4,
$md$# Stacks

A **stack** is a Last-In-First-Out (LIFO) collection — like a pile of plates. It supports three O(1) operations: `push`, `pop` and `peek`.

## Stacks in Java

Prefer `ArrayDeque` over the legacy `Stack` class:

```java
Deque<Integer> stack = new ArrayDeque<>();
stack.push(1);
stack.push(2);
stack.peek();  // 2
stack.pop();   // 2
stack.isEmpty(); // false
```

## Where stacks appear

- The **call stack**: each method call pushes a frame; returning pops it. Infinite recursion → `StackOverflowError`.
- Undo/redo, browser back button.
- Parsing expressions and matching brackets.
- Iterative DFS on trees and graphs.

## Matching brackets

```java
static boolean isValid(String s) {
    Deque<Character> stack = new ArrayDeque<>();
    for (char c : s.toCharArray()) {
        if (c == '(') stack.push(')');
        else if (c == '[') stack.push(']');
        else if (c == '{') stack.push('}');
        else if (stack.isEmpty() || stack.pop() != c) return false;
    }
    return stack.isEmpty();
}
```

Pushing the *expected closing bracket* keeps the comparison simple.

## Evaluating Reverse Polish Notation

In RPN (`["2","1","+","3","*"]` = `(2 + 1) * 3`), push numbers; on an operator pop two operands, apply it, and push the result. The last value on the stack is the answer.

## Monotonic stacks

To find the **next greater element** for every index in O(n), keep a stack of indexes whose values are decreasing. When a bigger value arrives, it is the answer for everything it pops:

```java
int[] res = new int[n];
Arrays.fill(res, -1);
Deque<Integer> st = new ArrayDeque<>();
for (int i = 0; i < n; i++) {
    while (!st.isEmpty() && nums[st.peek()] < nums[i]) {
        res[st.pop()] = nums[i];
    }
    st.push(i);
}
```

## Key takeaways

- LIFO with O(1) push/pop/peek.
- Use stacks for nesting (brackets), expression evaluation and "next greater" problems.$md$,
$md$## Practice

Solve **Valid Parentheses** and **Evaluate Reverse Polish Notation**. Explain why integer division in RPN must truncate toward zero.$md$),

('44444444-0002-4000-8000-000000000005', '33333333-0002-4000-8000-000000000001', '22222222-0000-4000-8000-000000000002',
 'queues', 'Queues', 'FIFO, deques, BFS and the sliding-window maximum.', 30, 5,
$md$# Queues

A **queue** is First-In-First-Out (FIFO) — like a line at a ticket counter. Core operations: `offer` (enqueue at the back) and `poll` (dequeue from the front), both O(1).

```java
Queue<String> q = new ArrayDeque<>();
q.offer("Ada");
q.offer("Linus");
q.poll();   // "Ada"
q.peek();   // "Linus"
```

## Variants

- **Deque** (double-ended queue): add/remove at both ends in O(1). `ArrayDeque` implements both stack and queue behaviour.
- **Priority queue**: always removes the smallest (or largest) element; implemented with a binary heap, O(log n) per operation.
- **Circular buffer**: a fixed-size array where head and tail indexes wrap around with `% capacity`.

## Queues in the real world

Print spoolers, task schedulers, message brokers (Kafka, RabbitMQ) and request buffers in web servers are all queues.

## Breadth-first search

BFS explores a graph level by level using a queue:

```java
Queue<Integer> queue = new ArrayDeque<>();
boolean[] seen = new boolean[n];
queue.offer(start);
seen[start] = true;
while (!queue.isEmpty()) {
    int node = queue.poll();
    for (int next : graph.get(node)) {
        if (!seen[next]) {
            seen[next] = true;
            queue.offer(next);
        }
    }
}
```

## Sliding window maximum with a deque

Keep indexes in a deque so their values are **decreasing**. The front is always the maximum of the current window; drop it once it slides out.

```java
Deque<Integer> dq = new ArrayDeque<>();
for (int i = 0; i < nums.length; i++) {
    if (!dq.isEmpty() && dq.peekFirst() <= i - k) dq.pollFirst();
    while (!dq.isEmpty() && nums[dq.peekLast()] <= nums[i]) dq.pollLast();
    dq.offerLast(i);
    if (i >= k - 1) result[i - k + 1] = nums[dq.peekFirst()];
}
```

Each index is added and removed at most once → O(n).

## Key takeaways

- FIFO with O(1) enqueue/dequeue.
- Queues power BFS and scheduling; deques power sliding-window tricks.$md$,
$md$## Practice

Solve **Find the Winner of the Circular Game** by simulating with a queue, then **Sliding Window Maximum** with a deque.$md$),

('44444444-0002-4000-8000-000000000006', '33333333-0002-4000-8000-000000000002', '22222222-0000-4000-8000-000000000002',
 'trees', 'Trees', 'Binary trees, traversals, BSTs and recursive thinking.', 40, 6,
$md$# Trees

A **tree** is a hierarchy of nodes with no cycles. A **binary tree** gives each node at most two children: `left` and `right`.

```java
class TreeNode {
    int val;
    TreeNode left, right;
    TreeNode(int val) { this.val = val; }
}
```

Vocabulary: **root** (top node), **leaf** (no children), **height/depth** (longest root-to-leaf path).

## Traversals

```java
void inorder(TreeNode node) {      // left, root, right
    if (node == null) return;
    inorder(node.left);
    System.out.print(node.val + " ");
    inorder(node.right);
}
```

- **Preorder** (root, left, right) — copy/serialise a tree.
- **Inorder** (left, root, right) — visits a BST in sorted order.
- **Postorder** (left, right, root) — delete or evaluate a tree.
- **Level order** — BFS with a queue, one level at a time.

## Thinking recursively

Most tree problems are "solve it for the children, then combine":

```java
int maxDepth(TreeNode root) {
    if (root == null) return 0;
    return 1 + Math.max(maxDepth(root.left), maxDepth(root.right));
}
```

## Binary search trees

In a **BST**, every value in the left subtree is smaller than the node and every value in the right subtree is larger. Search, insert and delete take **O(h)** where `h` is the height — O(log n) when balanced, O(n) when the tree degenerates into a line. Self-balancing trees (AVL, red-black; `TreeMap` in Java) keep `h = O(log n)`.

```java
boolean contains(TreeNode node, int target) {
    while (node != null) {
        if (target == node.val) return true;
        node = target < node.val ? node.left : node.right;
    }
    return false;
}
```

## Representing trees as arrays

In the playground a tree is given in **level order** with `null` for missing children: `[3,9,20,null,null,15,7]` is

```text
    3
   / \
  9   20
     /  \
    15   7
```

## Key takeaways

- Learn all four traversals; recursion is the natural tool.
- BST operations are O(height) — balance matters.$md$,
$md$## Practice

Solve **Maximum Depth of Binary Tree** (recursively) and **Binary Tree Level Order Traversal** (with a queue). Then draw the tree `[1,2,3,4,null,null,5]`.$md$),

('44444444-0002-4000-8000-000000000007', '33333333-0002-4000-8000-000000000002', '22222222-0000-4000-8000-000000000002',
 'graphs', 'Graphs', 'Representations, BFS, DFS and shortest paths in unweighted graphs.', 40, 7,
$md$# Graphs

A **graph** is a set of **vertices** connected by **edges**. Trees, road maps, social networks and package dependencies are all graphs. Edges may be **directed** or **undirected**, and **weighted** or unweighted.

## Representations

```java
// Adjacency list — O(V + E) space, the usual choice
List<List<Integer>> graph = new ArrayList<>();
for (int i = 0; i < n; i++) graph.add(new ArrayList<>());
for (int[] e : edges) {
    graph.get(e[0]).add(e[1]);
    graph.get(e[1]).add(e[0]); // omit for directed graphs
}
```

An **adjacency matrix** (`boolean[n][n]`) answers "is there an edge u→v?" in O(1) but uses O(V²) space — good only for dense graphs.

## Depth-first search

Go as deep as possible, then backtrack. Useful for connectivity, cycle detection and topological sort.

```java
void dfs(int node, boolean[] seen) {
    seen[node] = true;
    for (int next : graph.get(node)) {
        if (!seen[next]) dfs(next, seen);
    }
}
```

Counting connected components = number of times you start a new DFS from an unseen vertex.

## Breadth-first search and shortest paths

BFS visits vertices in order of distance, so in an **unweighted** graph it finds shortest paths:

```java
int[] dist = new int[n];
Arrays.fill(dist, -1);
dist[src] = 0;
Queue<Integer> q = new ArrayDeque<>(List.of(src));
while (!q.isEmpty()) {
    int u = q.poll();
    for (int v : graph.get(u)) {
        if (dist[v] == -1) {
            dist[v] = dist[u] + 1;
            q.offer(v);
        }
    }
}
```

For **weighted** graphs with non-negative weights use **Dijkstra's algorithm** (a priority queue instead of a queue).

## Grids are graphs

A 2D grid is a graph where each cell connects to its 4 neighbours. "Number of islands" is just counting connected components with DFS or BFS.

## Complexity

BFS and DFS both run in **O(V + E)** with an adjacency list.

## Key takeaways

- Use adjacency lists by default.
- DFS for connectivity and ordering; BFS for shortest paths in unweighted graphs.$md$,
$md$## Practice

Given `n = 6` and edges `[[0,1],[1,2],[3,4]]`, compute by hand the number of connected components (answer: 3 — vertex 5 is alone). Then implement it with DFS.$md$),

('44444444-0002-4000-8000-000000000008', '33333333-0002-4000-8000-000000000003', '22222222-0000-4000-8000-000000000002',
 'sorting', 'Sorting', 'Bubble, insertion, merge and quick sort; stability and complexity.', 40, 8,
$md$# Sorting

Sorting puts elements in order, and many problems become easy once the input is sorted (duplicates become neighbours, binary search becomes possible, intervals can be merged).

## The simple O(n²) sorts

**Insertion sort** grows a sorted prefix, inserting each new element into place. It is fast for small or nearly-sorted inputs.

```java
static void insertionSort(int[] a) {
    for (int i = 1; i < a.length; i++) {
        int key = a[i], j = i - 1;
        while (j >= 0 && a[j] > key) {
            a[j + 1] = a[j];
            j--;
        }
        a[j + 1] = key;
    }
}
```

Bubble sort and selection sort are also O(n²) and mainly of teaching value.

## Merge sort — O(n log n), stable

Split in half, sort each half recursively, then **merge** two sorted halves:

```java
static void mergeSort(int[] a, int lo, int hi) {
    if (hi - lo < 1) return;
    int mid = (lo + hi) >>> 1;
    mergeSort(a, lo, mid);
    mergeSort(a, mid + 1, hi);
    int[] tmp = new int[hi - lo + 1];
    int i = lo, j = mid + 1, k = 0;
    while (i <= mid && j <= hi) tmp[k++] = a[i] <= a[j] ? a[i++] : a[j++];
    while (i <= mid) tmp[k++] = a[i++];
    while (j <= hi) tmp[k++] = a[j++];
    System.arraycopy(tmp, 0, a, lo, tmp.length);
}
```

Always O(n log n), but needs O(n) extra memory.

## Quick sort — O(n log n) average

Pick a **pivot**, partition the array into smaller and larger elements, recurse on each side. In-place and very fast in practice, but O(n²) in the worst case (bad pivots), which random pivots make extremely unlikely.

## Stability

A sort is **stable** if equal elements keep their original order — important when sorting records by one key after another. Merge sort is stable; quick sort is not.

## What libraries use

`Arrays.sort(int[])` uses a dual-pivot quicksort; `Arrays.sort(Object[])` and `Collections.sort` use TimSort (a stable merge/insertion hybrid). Comparison-based sorting can never beat **O(n log n)** in the worst case.

```java
Arrays.sort(intervals, (x, y) -> Integer.compare(x[0], y[0]));
```

## Key takeaways

- Know insertion, merge and quick sort and their trade-offs.
- O(n log n) is the lower bound for comparison sorts.$md$,
$md$## Practice

Solve **Merge Intervals** (sort by start, then sweep). Then implement merge sort from memory and test it on `[5, 2, 4, 6, 1, 3]`.$md$),

('44444444-0002-4000-8000-000000000009', '33333333-0002-4000-8000-000000000003', '22222222-0000-4000-8000-000000000002',
 'searching', 'Searching', 'Linear search, binary search and binary search on the answer.', 35, 9,
$md$# Searching

## Linear search — O(n)

Check every element. It is the only option for unsorted data and is perfectly fine for small inputs.

## Binary search — O(log n)

On a **sorted** array, compare the target with the middle element and discard half of the range each step. A million elements need at most 20 comparisons.

```java
static int binarySearch(int[] nums, int target) {
    int lo = 0, hi = nums.length - 1;
    while (lo <= hi) {
        int mid = lo + (hi - lo) / 2;   // avoids int overflow
        if (nums[mid] == target) return mid;
        if (nums[mid] < target) lo = mid + 1;
        else hi = mid - 1;
    }
    return -1;
}
```

Three classic bugs: using `(lo + hi) / 2` (overflow on huge arrays), `lo < hi` instead of `lo <= hi` (misses single-element ranges) and forgetting `+ 1`/`- 1` (infinite loop).

## Finding boundaries

To find the **first** position where `nums[i] >= target` (the "lower bound"), keep searching left after a match:

```java
static int lowerBound(int[] nums, int target) {
    int lo = 0, hi = nums.length;          // half-open [lo, hi)
    while (lo < hi) {
        int mid = lo + (hi - lo) / 2;
        if (nums[mid] < target) lo = mid + 1;
        else hi = mid;
    }
    return lo;
}
```

`lowerBound(target)` and `lowerBound(target + 1) - 1` give the first and last positions of `target`.

## Binary search on the answer

If a yes/no question is **monotonic** ("can we ship all packages in D days with capacity C?" — if C works, any bigger C works too), you can binary search over the answer space instead of the array.

## Hash-based lookup

When you need repeated membership tests on unsorted data, a `HashSet`/`HashMap` gives **O(1) average** lookup at the cost of extra memory.

## Key takeaways

- Binary search needs sorted (or monotonic) data and runs in O(log n).
- Learn the lower-bound template; it solves most boundary problems.$md$,
$md$## Practice

Solve **Binary Search** and **Find First and Last Position of Element in Sorted Array**. For the second, explain why two binary searches are still O(log n).$md$);

-- ---------------------------------------------------------------------------
-- 3c. Lessons — DBMS
-- ---------------------------------------------------------------------------
insert into public.lessons (id, module_id, course_id, slug, title, summary, estimated_minutes, position, content, exercise) values
('44444444-0003-4000-8000-000000000001', '33333333-0003-4000-8000-000000000001', '22222222-0000-4000-8000-000000000003',
 'introduction-to-dbms', 'Introduction to DBMS', 'Why databases exist and what a DBMS does for you.', 15, 1,
$md$# Introduction to DBMS

A **Database Management System** (DBMS) stores data and lets many users query and change it safely. Compared with plain files, a DBMS gives you:

- **A query language** (SQL) instead of hand-written parsing code.
- **Concurrency control** — many users can write at once without corrupting data.
- **Durability and recovery** — committed data survives crashes.
- **Integrity constraints** — rules such as "email must be unique".
- **Security** — per-user permissions.

Popular **relational** systems: PostgreSQL, MySQL, SQLite, Oracle, SQL Server. **NoSQL** systems (MongoDB, Redis, Cassandra) trade some of these guarantees for flexible schemas or extreme scale.

```sql
select name, email from students where city = 'Pune';
```

You describe **what** you want; the DBMS decides **how** to fetch it.$md$,
$md$List three apps you use daily and guess what tables their databases might contain.$md$),

('44444444-0003-4000-8000-000000000002', '33333333-0003-4000-8000-000000000001', '22222222-0000-4000-8000-000000000003',
 'relational-model-keys', 'Relational Model & Keys', 'Tables, rows, primary keys and foreign keys.', 20, 2,
$md$# Relational Model & Keys

In the relational model data lives in **relations** (tables). Each **row** (tuple) is one record and each **column** (attribute) has a type.

- **Super key** — any set of columns that uniquely identifies a row.
- **Candidate key** — a minimal super key.
- **Primary key** — the candidate key you choose; unique and never null.
- **Foreign key** — a column that references another table's primary key, enforcing **referential integrity**.

```sql
create table courses (
  id    serial primary key,
  title text not null
);

create table enrollments (
  student_id int  references students (id),
  course_id  int  references courses (id) on delete cascade,
  primary key (student_id, course_id)   -- composite key
);
```

`on delete cascade` removes enrollments automatically when a course is deleted.$md$,
$md$Identify the candidate keys of a `users(id, email, username, name)` table.$md$),

('44444444-0003-4000-8000-000000000003', '33333333-0003-4000-8000-000000000001', '22222222-0000-4000-8000-000000000003',
 'er-modeling', 'ER Modelling', 'Entities, relationships and cardinality.', 20, 3,
$md$# ER Modelling

An **Entity-Relationship** diagram is a blueprint drawn before writing any SQL.

- **Entities** are things (Student, Course).
- **Attributes** describe them (name, email).
- **Relationships** connect them (a Student *enrolls in* a Course).

**Cardinality** shapes the tables:

| Relationship | Example | Implementation |
|---|---|---|
| 1 : 1 | user ↔ profile | FK with a unique constraint |
| 1 : N | course → lessons | FK on the "many" side (`lessons.course_id`) |
| M : N | students ↔ courses | a **junction table** (`enrollments`) |

A **weak entity** (e.g. an order line) cannot exist without its owner and uses the owner's key as part of its own.$md$,
$md$Draw an ER diagram for a library: books, members, loans and authors (a book can have many authors).$md$),

('44444444-0003-4000-8000-000000000004', '33333333-0003-4000-8000-000000000002', '22222222-0000-4000-8000-000000000003',
 'sql-basics', 'SQL Basics', 'SELECT, WHERE, ORDER BY, GROUP BY and aggregates.', 25, 4,
$md$# SQL Basics

```sql
select title, difficulty
from courses
where is_published = true
order by title
limit 10;
```

Aggregates summarise many rows:

```sql
select course_id, count(*) as students
from enrollments
group by course_id
having count(*) >= 5      -- filter groups (WHERE filters rows)
order by students desc;
```

Writing data:

```sql
insert into courses (title) values ('Operating Systems');
update courses set title = 'OS Fundamentals' where id = 4;
delete from courses where id = 4;
```

Logical order of evaluation: `FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY → LIMIT`. That is why you can't use a `SELECT` alias inside `WHERE`.

Always include a `WHERE` on `UPDATE`/`DELETE` — or you change every row.$md$,
$md$Write a query that returns the three most popular courses with their enrollment counts.$md$),

('44444444-0003-4000-8000-000000000005', '33333333-0003-4000-8000-000000000002', '22222222-0000-4000-8000-000000000003',
 'sql-joins', 'SQL Joins', 'INNER, LEFT, RIGHT and FULL joins with examples.', 25, 5,
$md$# SQL Joins

Joins combine rows from two tables using a related column.

```sql
-- INNER JOIN: only students who have at least one enrollment
select s.name, c.title
from students s
join enrollments e on e.student_id = s.id
join courses c     on c.id = e.course_id;

-- LEFT JOIN: every student, with NULLs when they have no enrollment
select s.name, count(e.course_id) as courses
from students s
left join enrollments e on e.student_id = s.id
group by s.name;
```

- **INNER** — matching rows only.
- **LEFT** — all rows from the left table + matches (or NULL).
- **RIGHT** — the mirror image of LEFT.
- **FULL** — all rows from both sides.
- **CROSS** — every combination (Cartesian product).

Find students with **no** enrollments with an anti-join:

```sql
select s.name from students s
left join enrollments e on e.student_id = s.id
where e.student_id is null;
```

Note `count(e.course_id)` counts non-null values, so students without courses get `0`, while `count(*)` would give `1`.$md$,
$md$Using `students`, `enrollments` and `courses`, list every course with the number of enrolled students, including courses with zero students.$md$),

('44444444-0003-4000-8000-000000000006', '33333333-0003-4000-8000-000000000002', '22222222-0000-4000-8000-000000000003',
 'normalization', 'Normalization', '1NF, 2NF, 3NF and BCNF in plain language.', 25, 6,
$md$# Normalization

Normalization removes **redundancy** so data can't become inconsistent (update, insert and delete anomalies).

- **1NF** — every column holds a single atomic value; no repeating groups like `phone1, phone2, phone3`.
- **2NF** — 1NF, and every non-key column depends on the **whole** primary key (matters for composite keys).
- **3NF** — 2NF, and non-key columns depend **only** on the key, not on other non-key columns (no transitive dependencies).
- **BCNF** — every determinant is a candidate key.

Example: `orders(order_id, customer_id, customer_city, ...)` violates 3NF because `customer_city` depends on `customer_id`. Move it to `customers(id, city)`.

In practice we normalise to 3NF, then **denormalise deliberately** (caches, materialised views) when reads need to be faster.$md$,
null),

('44444444-0003-4000-8000-000000000007', '33333333-0003-4000-8000-000000000003', '22222222-0000-4000-8000-000000000003',
 'transactions-acid', 'Transactions & ACID', 'Atomicity, consistency, isolation, durability and isolation levels.', 25, 7,
$md$# Transactions & ACID

A **transaction** groups statements so they succeed or fail together.

```sql
begin;
update accounts set balance = balance - 100 where id = 1;
update accounts set balance = balance + 100 where id = 2;
commit;   -- or rollback;
```

- **Atomicity** — all or nothing.
- **Consistency** — constraints hold before and after.
- **Isolation** — concurrent transactions don't see each other's half-finished work.
- **Durability** — once committed, data survives a crash (thanks to the write-ahead log).

Isolation levels trade safety for concurrency: **Read Committed** (PostgreSQL's default) prevents dirty reads; **Repeatable Read** also prevents non-repeatable reads; **Serializable** behaves as if transactions ran one after another.$md$,
null),

('44444444-0003-4000-8000-000000000008', '33333333-0003-4000-8000-000000000003', '22222222-0000-4000-8000-000000000003',
 'indexing', 'Indexing', 'B-tree indexes, when they help and when they hurt.', 20, 8,
$md$# Indexing

Without an index, `where email = 'a@b.com'` scans every row — O(n). A **B-tree index** keeps keys sorted in a balanced tree, making lookups O(log n).

```sql
create index students_email_idx on students (email);
explain analyze select * from students where email = 'a@b.com';
```

A **composite index** on `(course_id, created_at)` helps queries that filter on `course_id` (and optionally sort by `created_at`) — but not queries on `created_at` alone (leftmost-prefix rule).

Indexes are not free: every insert/update must maintain them and they use disk. Index columns used in `WHERE`, `JOIN` and `ORDER BY` of frequent queries, and verify with `EXPLAIN`.$md$,
null);

-- ---------------------------------------------------------------------------
-- 3d. Lessons — Operating Systems
-- ---------------------------------------------------------------------------
insert into public.lessons (id, module_id, course_id, slug, title, summary, estimated_minutes, position, content, exercise) values
('44444444-0004-4000-8000-000000000001', '33333333-0004-4000-8000-000000000001', '22222222-0000-4000-8000-000000000004',
 'what-is-an-os', 'What Is an Operating System?', 'Kernel vs user space and system calls.', 15, 1,
$md$# What Is an Operating System?

The OS manages hardware and provides abstractions so programs don't have to: **processes** (CPU), **virtual memory** (RAM) and **files** (disk).

The **kernel** runs in privileged *kernel mode*; your programs run in restricted *user mode*. To do anything privileged — read a file, open a socket — a program makes a **system call**:

```c
int fd = open("notes.txt", O_RDONLY);   // trap into the kernel
ssize_t n = read(fd, buf, sizeof buf);
close(fd);
```

On Linux, `strace ls` shows every system call a command makes. Monolithic kernels (Linux) run drivers inside the kernel; microkernels move them to user space for isolation.$md$,
$md$Run `strace -c ls` on Linux (or `dtruss` on macOS) and note the three most frequent system calls.$md$),

('44444444-0004-4000-8000-000000000002', '33333333-0004-4000-8000-000000000001', '22222222-0000-4000-8000-000000000004',
 'processes-and-threads', 'Processes & Threads', 'Process states, PCBs, threads and context switches.', 20, 2,
$md$# Processes & Threads

A **process** is a running program with its own address space, open files and at least one thread. The kernel tracks it in a **Process Control Block** (PID, registers, state, memory map).

States: **new → ready → running → waiting → terminated**.

A **thread** is a unit of execution *inside* a process. Threads share the heap and globals but each has its own stack and registers, so they are cheaper to create and switch than processes — and easier to break with data races.

```java
Thread t = new Thread(() -> System.out.println("hello from " + Thread.currentThread().getName()));
t.start();
t.join();
```

A **context switch** saves one thread's registers and restores another's; it costs microseconds, which adds up.$md$,
null),

('44444444-0004-4000-8000-000000000003', '33333333-0004-4000-8000-000000000001', '22222222-0000-4000-8000-000000000004',
 'cpu-scheduling', 'CPU Scheduling', 'FCFS, SJF, Round Robin and priority scheduling.', 25, 3,
$md$# CPU Scheduling

The scheduler decides which ready thread runs next. Common goals: low **waiting time**, fast **response time**, fairness.

- **FCFS** — first come, first served. Simple, but one long job delays everyone (convoy effect).
- **SJF / SRTF** — shortest job first; optimal average waiting time but needs to predict burst lengths.
- **Round Robin** — each job gets a time quantum (e.g. 10 ms), then goes to the back of the queue. Great response time.
- **Priority** — highest priority first; use **aging** to avoid starvation.

Example (burst times P1=24, P2=3, P3=3, all arriving at 0): FCFS average wait = (0 + 24 + 27) / 3 = **17 ms**; SJF = (0 + 3 + 6) / 3 = **3 ms**.

Linux uses the Completely Fair Scheduler (CFS), which tracks each task's virtual runtime.$md$,
$md$Compute the average waiting time for P1=5, P2=3, P3=8 with Round Robin, quantum 2.$md$),

('44444444-0004-4000-8000-000000000004', '33333333-0004-4000-8000-000000000002', '22222222-0000-4000-8000-000000000004',
 'synchronization', 'Synchronization', 'Race conditions, critical sections, mutexes and semaphores.', 25, 4,
$md$# Synchronization

`count++` is really *read, add, write*. Two threads interleaving those steps lose updates — a **race condition**.

```java
class Counter {
    private int count = 0;
    public synchronized void increment() { count++; }   // one thread at a time
    public synchronized int get() { return count; }
}
```

The code that touches shared state is the **critical section**. Tools to protect it:

- **Mutex / lock** — only one holder at a time.
- **Semaphore** — a counter allowing up to N holders (e.g. a pool of 5 DB connections).
- **Condition variables** — wait until some state is true (producer/consumer).
- **Atomics** — `AtomicInteger.incrementAndGet()` uses CPU compare-and-swap, no lock needed.

Keep critical sections short and always release locks (`try/finally`).$md$,
null),

('44444444-0004-4000-8000-000000000005', '33333333-0004-4000-8000-000000000002', '22222222-0000-4000-8000-000000000004',
 'deadlocks', 'Deadlocks', 'The four Coffman conditions and how to prevent them.', 20, 5,
$md$# Deadlocks

A **deadlock** happens when threads wait for each other forever. Thread A holds lock 1 and wants lock 2; thread B holds lock 2 and wants lock 1.

All four **Coffman conditions** must hold:

1. **Mutual exclusion** — resources can't be shared.
2. **Hold and wait** — holding one resource while waiting for another.
3. **No preemption** — resources can't be taken away.
4. **Circular wait** — a cycle of waiting threads.

Break any one to prevent deadlock. The most practical: **always acquire locks in a global order** (e.g. by account id), which makes circular wait impossible.

```java
Account first  = a.id < b.id ? a : b;
Account second = a.id < b.id ? b : a;
synchronized (first) { synchronized (second) { transfer(a, b, amount); } }
```

Alternatives: lock timeouts (`tryLock`), or detection + recovery (databases abort one transaction).$md$,
null),

('44444444-0004-4000-8000-000000000006', '33333333-0004-4000-8000-000000000002', '22222222-0000-4000-8000-000000000004',
 'virtual-memory', 'Memory Management & Virtual Memory', 'Paging, page tables, TLBs and page faults.', 25, 6,
$md$# Memory Management & Virtual Memory

Every process sees its own **virtual address space**. The MMU translates virtual addresses to physical ones using **page tables**, in fixed-size **pages** (usually 4 KiB).

- **Isolation** — a process can't read another's memory.
- **Overcommit** — pages not in RAM can live on disk (swap).
- **Sharing** — the same physical page (e.g. a shared library) can be mapped into many processes.

Accessing a page that isn't in RAM triggers a **page fault**; the OS loads it and retries. When RAM is full, a **replacement policy** (LRU approximations like the clock algorithm) evicts a page. Too many faults = **thrashing**.

The **TLB** caches recent translations so most lookups avoid walking the page table.$md$,
null);

-- ---------------------------------------------------------------------------
-- 3e. Lessons — Computer Networks
-- ---------------------------------------------------------------------------
insert into public.lessons (id, module_id, course_id, slug, title, summary, estimated_minutes, position, content, exercise) values
('44444444-0005-4000-8000-000000000001', '33333333-0005-4000-8000-000000000001', '22222222-0000-4000-8000-000000000005',
 'osi-and-tcp-ip', 'OSI & TCP/IP Models', 'Layers, encapsulation and who does what.', 20, 1,
$md$# OSI & TCP/IP Models

Networks are built in **layers**; each layer serves the one above it.

| TCP/IP layer | OSI layers | Examples | Unit |
|---|---|---|---|
| Application | 7, 6, 5 | HTTP, DNS, SMTP | message |
| Transport | 4 | TCP, UDP | segment |
| Internet | 3 | IP, ICMP | packet |
| Link | 2, 1 | Ethernet, Wi-Fi | frame |

When you send data, each layer **encapsulates** it with its own header (HTTP → TCP header → IP header → Ethernet frame). The receiver strips the headers in reverse.

Routers work at layer 3 (IP), switches at layer 2 (MAC addresses).$md$,
null),

('44444444-0005-4000-8000-000000000002', '33333333-0005-4000-8000-000000000001', '22222222-0000-4000-8000-000000000005',
 'ip-addressing-subnetting', 'IP Addressing & Subnetting', 'IPv4, CIDR notation, private ranges and NAT.', 25, 2,
$md$# IP Addressing & Subnetting

An IPv4 address is 32 bits, written as four octets: `192.168.1.20`. **CIDR** notation `/24` says how many leading bits are the **network** part.

```text
192.168.1.0/24  → network 192.168.1.0, 256 addresses (254 usable hosts)
10.0.0.0/16     → 65,536 addresses
```

Usable hosts = 2^(32 − prefix) − 2 (network and broadcast addresses are reserved).

Private ranges (not routed on the internet): `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`. Home routers use **NAT** to share one public IP among many private devices.

IPv6 uses 128-bit addresses (`2001:db8::1`) and removes the need for NAT.$md$,
$md$How many usable hosts are in a /27? Split 192.168.10.0/24 into four equal subnets.$md$),

('44444444-0005-4000-8000-000000000003', '33333333-0005-4000-8000-000000000002', '22222222-0000-4000-8000-000000000005',
 'tcp-vs-udp', 'TCP vs UDP', 'Reliability, the three-way handshake and when to choose UDP.', 20, 3,
$md$# TCP vs UDP

**TCP** provides a reliable, ordered byte stream:

- **Three-way handshake**: `SYN → SYN-ACK → ACK` before any data.
- Sequence numbers + acknowledgements + retransmission → no loss, no reordering.
- **Flow control** (receiver window) and **congestion control** (slow start).

**UDP** just sends datagrams: no connection, no ordering, no retransmission — but minimal overhead and latency.

| Use TCP for | Use UDP for |
|---|---|
| Web pages, APIs, file transfer, SSH | Video calls, games, DNS queries, live streaming |

Modern **QUIC** (used by HTTP/3) builds reliability on top of UDP to avoid TCP's head-of-line blocking.$md$,
null),

('44444444-0005-4000-8000-000000000004', '33333333-0005-4000-8000-000000000002', '22222222-0000-4000-8000-000000000005',
 'dns', 'DNS', 'How a domain name becomes an IP address.', 15, 4,
$md$# DNS

The **Domain Name System** translates `rookie.dev` into an IP address.

1. Your OS asks a **recursive resolver** (your ISP's, or 1.1.1.1 / 8.8.8.8).
2. The resolver asks a **root server** → which points to the **.dev TLD servers**.
3. The TLD servers point to the domain's **authoritative name server**.
4. The authoritative server returns the record; everyone caches it for its **TTL**.

Common records: `A` (IPv4), `AAAA` (IPv6), `CNAME` (alias), `MX` (mail), `TXT` (verification, SPF).

```bash
dig rookie.dev A +short
nslookup example.com
```$md$,
null),

('44444444-0005-4000-8000-000000000005', '33333333-0005-4000-8000-000000000002', '22222222-0000-4000-8000-000000000005',
 'http-and-https', 'HTTP & HTTPS', 'Requests, responses, status codes and TLS.', 25, 5,
$md$# HTTP & HTTPS

HTTP is a request/response protocol.

```http
GET /api/courses?limit=10 HTTP/1.1
Host: rookie.dev
Accept: application/json
```

```http
HTTP/1.1 200 OK
Content-Type: application/json
Cache-Control: max-age=60

[{"id": 1, "title": "Java Fundamentals"}]
```

Methods: `GET` (read), `POST` (create), `PUT`/`PATCH` (update), `DELETE`. Status classes: **2xx** success, **3xx** redirect, **4xx** client error (400, 401, 403, 404), **5xx** server error.

**HTTPS** = HTTP over **TLS**: the server proves its identity with a certificate, then both sides agree on keys so traffic is encrypted and tamper-proof. HTTP/2 multiplexes many requests over one connection; HTTP/3 runs over QUIC.$md$,
$md$Open your browser's DevTools → Network tab, load any site and find one 200, one 304 and one redirect response.$md$);

-- ---------------------------------------------------------------------------
-- 3f. Lessons — Object Oriented Programming
-- ---------------------------------------------------------------------------
insert into public.lessons (id, module_id, course_id, slug, title, summary, estimated_minutes, position, content, exercise) values
('44444444-0006-4000-8000-000000000001', '33333333-0006-4000-8000-000000000001', '22222222-0000-4000-8000-000000000006',
 'classes-and-objects', 'Classes & Objects', 'Modelling state and behaviour.', 20, 1,
$md$# Classes & Objects

A **class** defines the state and behaviour shared by all its **objects**.

```java
public class Book {
    private final String title;
    private int pagesRead;

    public Book(String title) { this.title = title; }

    public void read(int pages) { pagesRead += pages; }
    public int getPagesRead()   { return pagesRead; }
}

Book b = new Book("Clean Code");
b.read(30);
```

Every object has **identity** (it is a distinct thing in memory), **state** (its field values) and **behaviour** (its methods). Two `Book` objects with the same title are still different objects — `==` compares identity, `equals()` compares meaning (override it, together with `hashCode()`).$md$,
null),

('44444444-0006-4000-8000-000000000002', '33333333-0006-4000-8000-000000000001', '22222222-0000-4000-8000-000000000006',
 'encapsulation', 'Encapsulation', 'Hiding state and protecting invariants.', 20, 2,
$md$# Encapsulation

Encapsulation means an object **owns its data** and exposes only safe operations.

```java
public class Temperature {
    private double celsius;

    public void setCelsius(double c) {
        if (c < -273.15) throw new IllegalArgumentException("Below absolute zero");
        this.celsius = c;
    }
    public double getFahrenheit() { return celsius * 9 / 5 + 32; }
}
```

Benefits: invariants can't be broken from outside, and you can change the internal representation (store Kelvin instead) without breaking callers.

Access modifiers: `private` (class only) → package-private (no keyword) → `protected` (package + subclasses) → `public`. Start with `private` and open up only when needed. Prefer **immutable** objects (`final` fields, no setters) when possible.$md$,
null),

('44444444-0006-4000-8000-000000000003', '33333333-0006-4000-8000-000000000001', '22222222-0000-4000-8000-000000000006',
 'inheritance', 'Inheritance', 'extends, super, overriding and the is-a relationship.', 20, 3,
$md$# Inheritance

A subclass **inherits** fields and methods from a superclass and can **override** behaviour.

```java
class Animal {
    protected final String name;
    Animal(String name) { this.name = name; }
    String sound() { return "..."; }
}

class Dog extends Animal {
    Dog(String name) { super(name); }          // call the parent constructor
    @Override String sound() { return "Woof"; }
}
```

Use inheritance only for a true **is-a** relationship (a Dog *is an* Animal). Java has single inheritance of classes, and every class ultimately extends `Object`.

Deep hierarchies become fragile — changes in a base class ripple everywhere. The common advice is **"favour composition over inheritance"**: a `Car` *has an* `Engine` rather than *being* one.$md$,
null),

('44444444-0006-4000-8000-000000000004', '33333333-0006-4000-8000-000000000001', '22222222-0000-4000-8000-000000000006',
 'polymorphism', 'Polymorphism', 'Dynamic dispatch, overriding vs overloading.', 20, 4,
$md$# Polymorphism

Polymorphism lets one piece of code work with many types.

```java
List<Animal> zoo = List.of(new Dog("Rex"), new Cat("Tom"));
for (Animal a : zoo) {
    System.out.println(a.name + ": " + a.sound());   // Woof, Meow
}
```

The declared type is `Animal`, but the JVM calls the method of the **actual object** at runtime — **dynamic dispatch** (runtime polymorphism, via overriding).

**Overloading** is compile-time polymorphism: several methods with the same name and different parameter lists, chosen by the compiler.

Polymorphism is what lets you add a new `Parrot` class without touching the loop above.$md$,
null),

('44444444-0006-4000-8000-000000000005', '33333333-0006-4000-8000-000000000001', '22222222-0000-4000-8000-000000000006',
 'abstraction-and-interfaces', 'Abstraction & Interfaces', 'Abstract classes vs interfaces.', 25, 5,
$md$# Abstraction & Interfaces

**Abstraction** exposes *what* something does and hides *how*.

```java
interface PaymentGateway {
    Receipt charge(Money amount, Card card);
}

class StripeGateway implements PaymentGateway { /* ... */ }
class FakeGateway   implements PaymentGateway { /* used in tests */ }
```

Code that depends on `PaymentGateway` doesn't care which implementation it gets.

| Abstract class | Interface |
|---|---|
| Can hold state (fields) and constructors | No instance state |
| Single inheritance | A class can implement many |
| Share code between close relatives | Define a capability/contract |

Since Java 8, interfaces can have `default` methods, which blurs the line — but "interface for contracts, abstract class for shared implementation" remains a good rule.$md$,
null),

('44444444-0006-4000-8000-000000000006', '33333333-0006-4000-8000-000000000002', '22222222-0000-4000-8000-000000000006',
 'solid-principles', 'SOLID Principles', 'Five guidelines for maintainable object-oriented code.', 30, 6,
$md$# SOLID Principles

- **S — Single Responsibility:** a class should have one reason to change. Split `InvoiceService` that calculates totals *and* sends emails.
- **O — Open/Closed:** open for extension, closed for modification. Add a new `DiscountRule` implementation instead of editing a giant `if` chain.
- **L — Liskov Substitution:** subclasses must work wherever the parent is expected. A `Square` that breaks `Rectangle.setWidth` violates it.
- **I — Interface Segregation:** many small interfaces beat one fat one. A printer shouldn't implement `fax()`.
- **D — Dependency Inversion:** depend on abstractions; inject them.

```java
class OrderService {
    private final PaymentGateway payments;            // abstraction
    OrderService(PaymentGateway payments) { this.payments = payments; }
}
```

These are guidelines, not laws — apply them when code starts to hurt.$md$,
null),

('44444444-0006-4000-8000-000000000007', '33333333-0006-4000-8000-000000000002', '22222222-0000-4000-8000-000000000006',
 'design-patterns', 'Common Design Patterns', 'Factory, Strategy, Observer, Builder and Singleton.', 30, 7,
$md$# Common Design Patterns

Patterns are named solutions to recurring design problems.

- **Strategy** — swap algorithms at runtime (`SortStrategy`, `PricingStrategy`).
- **Factory** — centralise object creation: `Notification.of("email")`.
- **Builder** — construct complex objects step by step:

```java
HttpRequest req = HttpRequest.newBuilder()
    .uri(URI.create("https://rookie.dev/api/courses"))
    .header("Accept", "application/json")
    .GET()
    .build();
```

- **Observer** — subscribers are notified of events (UI listeners, pub/sub).
- **Singleton** — exactly one instance; use sparingly, it is global state in disguise (prefer dependency injection).

Learn to recognise them in frameworks — Spring, React and the JDK use them everywhere.$md$,
null);

-- ---------------------------------------------------------------------------
-- 3g. Lessons — Backend Development
-- ---------------------------------------------------------------------------
insert into public.lessons (id, module_id, course_id, slug, title, summary, estimated_minutes, position, content, exercise) values
('44444444-0007-4000-8000-000000000001', '33333333-0007-4000-8000-000000000001', '22222222-0000-4000-8000-000000000007',
 'rest-api-design', 'REST API Design', 'Resources, verbs, status codes and pagination.', 25, 1,
$md$# REST API Design

Model your API around **resources** (nouns) and use HTTP **methods** as verbs.

```text
GET    /courses             list courses
POST   /courses             create a course          → 201 Created
GET    /courses/42          read one                 → 200 / 404
PATCH  /courses/42          partial update           → 200
DELETE /courses/42          delete                   → 204 No Content
GET    /courses/42/lessons  nested collection
```

Good habits:

- Return precise status codes: 400 validation, 401 unauthenticated, 403 forbidden, 409 conflict.
- Consistent error bodies: `{ "error": "title is required" }`.
- Paginate lists: `?limit=20&cursor=...`.
- Version breaking changes: `/v2/...`.
- `GET`, `PUT` and `DELETE` should be **idempotent**.$md$,
$md$Design the endpoints for a todo app with users, lists and items.$md$),

('44444444-0007-4000-8000-000000000002', '33333333-0007-4000-8000-000000000001', '22222222-0000-4000-8000-000000000007',
 'nodejs-and-express', 'Node.js & Express', 'Routing, middleware and JSON handling.', 30, 2,
$md$# Node.js & Express

Node.js runs JavaScript on the server with a single-threaded **event loop** and non-blocking I/O. Express is a minimal web framework on top of it.

```js
import express from 'express';

const app = express();
app.use(express.json());            // middleware: parse JSON bodies

const courses = [{ id: 1, title: 'Java Fundamentals' }];

app.get('/courses', (req, res) => res.json(courses));

app.post('/courses', (req, res) => {
  if (!req.body.title) return res.status(400).json({ error: 'title is required' });
  const course = { id: courses.length + 1, title: req.body.title };
  courses.push(course);
  res.status(201).json(course);
});

app.listen(3000, () => console.log('API on :3000'));
```

**Middleware** functions `(req, res, next)` run in order — use them for logging, auth and error handling. Never block the event loop with heavy CPU work.$md$,
null),

('44444444-0007-4000-8000-000000000003', '33333333-0007-4000-8000-000000000001', '22222222-0000-4000-8000-000000000007',
 'authentication', 'Authentication & Authorization', 'Password hashing, sessions vs JWTs, RBAC.', 30, 3,
$md$# Authentication & Authorization

**Authentication** = who are you? **Authorization** = what may you do?

Never store plain passwords — hash them with a slow, salted algorithm:

```js
import bcrypt from 'bcrypt';
const hash = await bcrypt.hash(password, 12);
const ok = await bcrypt.compare(attempt, hash);
```

After login, the server needs to recognise the user on each request:

- **Sessions** — a random session id in an `HttpOnly` cookie; state lives on the server. Easy to revoke.
- **JWTs** — a signed token containing claims (`sub`, `role`, `exp`). Stateless, but hard to revoke before expiry — keep them short-lived.

Authorization is often **role-based** (student, instructor, admin) and should be enforced on the server — Rookie does it in the database with Row Level Security.$md$,
null),

('44444444-0007-4000-8000-000000000004', '33333333-0007-4000-8000-000000000002', '22222222-0000-4000-8000-000000000007',
 'databases-and-orms', 'Databases & ORMs', 'Connection pools, parameterised queries and migrations.', 25, 4,
$md$# Databases & ORMs

Talk to the database through a **connection pool** — opening a connection per request is slow.

Always use **parameterised queries** to prevent SQL injection:

```js
// ✅ safe
await pool.query('select * from users where email = $1', [email]);
// ❌ vulnerable: "' or 1=1 --"
await pool.query(`select * from users where email = '${email}'`);
```

An **ORM** (Prisma, TypeORM, Hibernate) maps tables to objects and generates SQL. Great for CRUD; watch out for the **N+1 query problem** (loading a list, then one query per item) — use joins or eager loading.

Schema changes go in versioned **migrations** checked into git, so every environment can be rebuilt identically.$md$,
null),

('44444444-0007-4000-8000-000000000005', '33333333-0007-4000-8000-000000000002', '22222222-0000-4000-8000-000000000007',
 'caching', 'Caching', 'Cache-aside with Redis, TTLs and invalidation.', 20, 5,
$md$# Caching

A cache keeps hot data in fast storage (memory, Redis) to cut latency and database load.

**Cache-aside** is the most common pattern:

```js
async function getCourse(id) {
  const cached = await redis.get(`course:${id}`);
  if (cached) return JSON.parse(cached);
  const course = await db.findCourse(id);
  await redis.set(`course:${id}`, JSON.stringify(course), { EX: 300 }); // 5 min TTL
  return course;
}
```

On updates, **delete** the key so the next read refreshes it. Hard parts: stale data, cache stampedes (many misses at once) and choosing what to cache. HTTP caching (`Cache-Control`, `ETag`) and CDNs are caches too.$md$,
null),

('44444444-0007-4000-8000-000000000006', '33333333-0007-4000-8000-000000000002', '22222222-0000-4000-8000-000000000007',
 'testing-and-deployment', 'Testing & Deployment', 'Unit and integration tests, CI and environment config.', 25, 6,
$md$# Testing & Deployment

The **test pyramid**: many fast **unit tests**, fewer **integration tests** (API + real database), a handful of **end-to-end** tests.

```js
import request from 'supertest';
test('POST /courses validates title', async () => {
  const res = await request(app).post('/courses').send({});
  expect(res.status).toBe(400);
});
```

Deployment checklist:

- Config and secrets via **environment variables**, never committed.
- **CI** runs lint + tests on every pull request.
- Build once, deploy the same artifact (often a Docker image) to staging then production.
- Health checks, structured logs and error tracking so you know when it breaks.$md$,
null);

-- ---------------------------------------------------------------------------
-- 3h. Lessons — Frontend Development
-- ---------------------------------------------------------------------------
insert into public.lessons (id, module_id, course_id, slug, title, summary, estimated_minutes, position, content, exercise) values
('44444444-0008-4000-8000-000000000001', '33333333-0008-4000-8000-000000000001', '22222222-0000-4000-8000-000000000008',
 'semantic-html', 'Semantic HTML', 'Meaningful structure and accessibility basics.', 20, 1,
$md$# Semantic HTML

Use elements for their **meaning**, not their looks. Screen readers, search engines and keyboard users depend on it.

```html
<header>
  <nav aria-label="Main">
    <a href="/courses">Courses</a>
  </nav>
</header>
<main>
  <article>
    <h1>Java Fundamentals</h1>
    <p>Write your first real programs.</p>
    <button type="button">Enroll</button>
  </article>
</main>
<footer>© Rookie</footer>
```

Rules of thumb: one `<h1>` per page and no skipped heading levels; a `<button>` for actions and an `<a>` for navigation (never a clickable `<div>`); every `<img>` gets meaningful `alt` text; every input gets a `<label>`.$md$,
null),

('44444444-0008-4000-8000-000000000002', '33333333-0008-4000-8000-000000000001', '22222222-0000-4000-8000-000000000008',
 'css-layout', 'CSS Layout: Flexbox & Grid', 'One-dimensional and two-dimensional layout.', 30, 2,
$md$# CSS Layout: Flexbox & Grid

**Flexbox** lays items out in one dimension (a row *or* a column):

```css
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}
```

**Grid** handles two dimensions:

```css
.cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 1.5rem;
}
```

That one `grid-template-columns` line gives a responsive card grid without media queries. Use `box-sizing: border-box`, relative units (`rem`, `%`) and mobile-first media queries (`@media (min-width: 768px)`).$md$,
$md$Build a responsive card grid that shows one column on phones and three on desktops.$md$),

('44444444-0008-4000-8000-000000000003', '33333333-0008-4000-8000-000000000001', '22222222-0000-4000-8000-000000000008',
 'javascript-and-the-dom', 'JavaScript & the DOM', 'Selecting elements, events and updating the page.', 30, 3,
$md$# JavaScript & the DOM

The **DOM** is the browser's tree of objects representing the page. JavaScript reads and changes it.

```js
const button = document.querySelector('#like');
const count = document.querySelector('#count');
let likes = 0;

button.addEventListener('click', () => {
  likes += 1;
  count.textContent = String(likes);   // textContent, not innerHTML, for user data
});
```

Key ideas: events **bubble** up the tree, so one listener on a parent can handle many children (event delegation); `fetch()` returns a Promise — use `async/await`; manipulating the DOM by hand gets messy as apps grow, which is why frameworks like React exist.$md$,
null),

('44444444-0008-4000-8000-000000000004', '33333333-0008-4000-8000-000000000002', '22222222-0000-4000-8000-000000000008',
 'react-components', 'React Components & Props', 'Thinking in components and JSX.', 30, 4,
$md$# React Components & Props

A React **component** is a function that returns UI described in **JSX**.

```jsx
function CourseCard({ title, hours, onEnroll }) {
  return (
    <article className="card">
      <h3>{title}</h3>
      <p>{hours} hours</p>
      <button onClick={onEnroll}>Enroll</button>
    </article>
  );
}

<CourseCard title="Java Fundamentals" hours={20} onEnroll={() => enroll(1)} />
```

**Props** flow down from parent to child and are read-only. When rendering lists, give each item a stable `key` (`courses.map(c => <CourseCard key={c.id} ... />)`). Break the UI into small components that each do one thing.$md$,
null),

('44444444-0008-4000-8000-000000000005', '33333333-0008-4000-8000-000000000002', '22222222-0000-4000-8000-000000000008',
 'state-and-hooks', 'State & Hooks', 'useState, useEffect and lifting state up.', 30, 5,
$md$# State & Hooks

**State** is data that changes over time and triggers a re-render.

```jsx
import { useState } from 'react';

function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(c => c + 1)}>Clicked {count} times</button>;
}
```

- Never mutate state directly — always call the setter with a new value.
- Use the updater form `setCount(c => c + 1)` when the next value depends on the previous one.
- `useEffect` synchronises with things outside React (subscriptions, timers); return a cleanup function.
- When two components need the same state, **lift it up** to their closest common parent.
- Derive values during render instead of storing duplicates in state.$md$,
null),

('44444444-0008-4000-8000-000000000006', '33333333-0008-4000-8000-000000000002', '22222222-0000-4000-8000-000000000008',
 'data-fetching', 'Data Fetching', 'Loading, error and empty states.', 25, 6,
$md$# Data Fetching

Every request has three states your UI must handle: **loading**, **error** and **success** (including *empty*).

```jsx
function Courses() {
  const [state, setState] = useState({ status: 'loading' });

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/courses', { signal: controller.signal })
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(r.statusText))))
      .then(data => setState({ status: 'success', data }))
      .catch(err => { if (err.name !== 'AbortError') setState({ status: 'error', err }); });
    return () => controller.abort();
  }, []);

  if (state.status === 'loading') return <Spinner />;
  if (state.status === 'error') return <p>Could not load courses.</p>;
  if (state.data.length === 0) return <p>No courses yet.</p>;
  return state.data.map(c => <CourseCard key={c.id} {...c} />);
}
```

In real apps use a library (TanStack Query, SWR) or server components (Next.js) for caching and revalidation.$md$,
null);

-- ---------------------------------------------------------------------------
-- 3i. Lessons — System Design
-- ---------------------------------------------------------------------------
insert into public.lessons (id, module_id, course_id, slug, title, summary, estimated_minutes, position, content, exercise) values
('44444444-0009-4000-8000-000000000001', '33333333-0009-4000-8000-000000000001', '22222222-0000-4000-8000-000000000009',
 'scalability-basics', 'Scalability Basics', 'Vertical vs horizontal scaling, latency and throughput.', 25, 1,
$md$# Scalability Basics

- **Vertical scaling** — a bigger machine. Simple, but has a ceiling and a single point of failure.
- **Horizontal scaling** — more machines behind a load balancer. Requires **stateless** app servers (sessions in Redis or a DB, not in memory).

Know your numbers: **latency** (time per request, watch p95/p99, not just the average) and **throughput** (requests per second).

Back-of-the-envelope: 10 M daily users × 20 requests/day ≈ 200 M requests/day ≈ **2,300 req/s** on average; plan for ~3–5× at peak.

Useful latencies: memory read ~100 ns, SSD read ~100 µs, same-datacenter round trip ~0.5 ms, cross-continent round trip ~150 ms.$md$,
null),

('44444444-0009-4000-8000-000000000002', '33333333-0009-4000-8000-000000000001', '22222222-0000-4000-8000-000000000009',
 'load-balancing', 'Load Balancing', 'Algorithms, health checks and L4 vs L7.', 20, 2,
$md$# Load Balancing

A load balancer spreads traffic across servers and removes unhealthy ones using **health checks**.

Algorithms: **round robin**, **least connections**, **IP/consistent hashing** (same client → same server).

- **L4** balancers route by IP and port — fast, protocol-agnostic.
- **L7** balancers understand HTTP — route `/api` and `/static` differently, terminate TLS, add headers.

```text
client → DNS → L7 load balancer → [app-1, app-2, app-3] → database
```

Run balancers in pairs (active/passive) so they don't become the new single point of failure.$md$,
null),

('44444444-0009-4000-8000-000000000003', '33333333-0009-4000-8000-000000000001', '22222222-0000-4000-8000-000000000009',
 'caching-strategies', 'Caching Strategies', 'Where to cache and how to keep caches fresh.', 25, 3,
$md$# Caching Strategies

Caches exist at every layer: browser → CDN → reverse proxy → application (Redis) → database buffer pool.

Write strategies:

- **Cache-aside** — app reads cache, falls back to DB and populates the cache.
- **Write-through** — write to cache and DB together; reads are always warm.
- **Write-back** — write to cache, flush to DB later; fast but risks data loss.

Eviction: **LRU** is the usual default; **TTLs** bound staleness.

> "There are only two hard things in computer science: cache invalidation and naming things." — Phil Karlton

Cache what is read often, changes rarely and is expensive to compute.$md$,
null),

('44444444-0009-4000-8000-000000000004', '33333333-0009-4000-8000-000000000002', '22222222-0000-4000-8000-000000000009',
 'database-scaling', 'Database Replication & Sharding', 'Read replicas, partitioning and the CAP theorem.', 30, 4,
$md$# Database Replication & Sharding

**Replication** copies data to other nodes. A primary takes writes; **read replicas** serve reads. Asynchronous replication means replicas can lag — users may not see their own write immediately.

**Sharding** splits data across nodes by a **shard key** (e.g. `user_id % 16`, or consistent hashing). It scales writes, but cross-shard queries and transactions get hard, and a bad key creates hot shards.

The **CAP theorem**: during a network **P**artition you must choose **C**onsistency or **A**vailability. In practice, systems tune a spectrum between strong and eventual consistency.

Scale in order: indexes and query tuning → caching → read replicas → sharding.$md$,
null),

('44444444-0009-4000-8000-000000000005', '33333333-0009-4000-8000-000000000002', '22222222-0000-4000-8000-000000000009',
 'message-queues', 'Message Queues & Async Processing', 'Decoupling producers and consumers.', 25, 5,
$md$# Message Queues & Async Processing

Not everything must happen inside the request. Put slow work (emails, video encoding, notifications) on a **queue** and let **workers** process it.

```text
API ──publish──▶ [ queue ] ──▶ worker-1
                            └─▶ worker-2
```

Benefits: faster responses, absorbing traffic spikes, independent scaling and retries.

Things to design for:

- **At-least-once delivery** → consumers must be **idempotent** (processing a message twice is harmless).
- **Dead-letter queues** for messages that keep failing.
- Ordering is usually per partition/key, not global.

Tools: RabbitMQ, Amazon SQS, Kafka (a distributed log you can replay).$md$,
null),

('44444444-0009-4000-8000-000000000006', '33333333-0009-4000-8000-000000000002', '22222222-0000-4000-8000-000000000009',
 'design-a-url-shortener', 'Case Study: Design a URL Shortener', 'Requirements, API, key generation and scaling.', 40, 6,
$md$# Case Study: Design a URL Shortener

**Requirements:** shorten a long URL, redirect fast, ~100 M new links/month, reads ≫ writes (100:1).

**API**

```text
POST /links { "url": "https://..." }  → { "code": "aZ3x9Q" }
GET  /aZ3x9Q                          → 301/302 redirect
```

**Key generation:** encode a unique 64-bit id (from a sequence or a Snowflake-style generator) in **base62**. Seven characters give 62⁷ ≈ 3.5 trillion codes. Avoid random codes with collision checks at high write rates.

**Storage:** `links(code primary key, url, created_at, owner_id)` in a key-value store or a sharded SQL table.

**Reads:** cache hot codes in Redis and at the CDN; a 302 lets you count clicks, a 301 is cached by browsers.

**Extras:** rate limiting, malicious-URL scanning, analytics through an async queue.$md$,
$md$Estimate the storage needed for 5 years of links if each row is ~500 bytes.$md$);

-- ---------------------------------------------------------------------------
-- 6b. Achievement definitions (before any activity so unlocks fire)
-- ---------------------------------------------------------------------------
insert into public.achievements (code, title, description, icon, criteria, position) values
  ('first_lesson',       'First Lesson',        'Complete your first lesson.',                       '🎯', '{"kind":"count","activity":"lesson_completed","threshold":1}', 1),
  ('lessons_10',         'Bookworm',            'Complete 10 lessons.',                              '📖', '{"kind":"count","activity":"lesson_completed","threshold":10}', 2),
  ('streak_7',           '7 Day Streak',        'Learn something meaningful 7 days in a row.',       '🔥', '{"kind":"streak","threshold":7}', 3),
  ('streak_30',          '30 Day Streak',       'Keep a 30 day learning streak.',                    '⚡', '{"kind":"streak","threshold":30}', 4),
  ('first_problem',      'First Coding Problem','Solve your first coding problem.',                  '💻', '{"kind":"count","activity":"problem_solved","threshold":1}', 5),
  ('problems_10',        'Problem Solver',      'Solve 10 coding problems.',                         '🧩', '{"kind":"count","activity":"problem_solved","threshold":10}', 6),
  ('problems_50',        '50 Problems Solved',  'Solve 50 coding problems.',                         '🏆', '{"kind":"count","activity":"problem_solved","threshold":50}', 7),
  ('first_course',       'Completed First Course','Finish every lesson in a course.',                '📚', '{"kind":"count","activity":"course_completed","threshold":1}', 8),
  ('first_assignment',   'Shipped It',          'Submit your first assignment.',                     '📝', '{"kind":"count","activity":"assignment_submitted","threshold":1}', 9),
  ('first_class',        'Showed Up',           'Attend your first live class.',                     '🎥', '{"kind":"count","activity":"class_attended","threshold":1}', 10),
  ('perfect_attendance', 'Perfect Attendance',  '100% attendance across at least 5 classes.',        '🎓', '{"kind":"attendance_rate","threshold":100,"min_classes":5}', 11),
  ('roadmap_node_10',    'Pathfinder',          'Complete 10 roadmap topics.',                       '🗺️', '{"kind":"count","activity":"roadmap_node_completed","threshold":10}', 12)
on conflict (code) do update
  set title = excluded.title, description = excluded.description, icon = excluded.icon,
      criteria = excluded.criteria, position = excluded.position;
-- ---------------------------------------------------------------------------
-- 4. Lesson resources
-- ---------------------------------------------------------------------------
insert into public.lesson_resources (lesson_id, title, url, kind, position)
select l.id, r.title, r.url, r.kind::public.resource_kind, r.position
from (values
  ('java-fundamentals', 'introduction-to-java', 'Getting Started with Java (dev.java)', 'https://dev.java/learn/getting-started/', 'docs', 1),
  ('java-fundamentals', 'introduction-to-java', 'Download the JDK (Adoptium Temurin)', 'https://adoptium.net/', 'other', 2),
  ('java-fundamentals', 'introduction-to-java', 'The Java Tutorials — Hello World', 'https://docs.oracle.com/javase/tutorial/getStarted/cupojava/index.html', 'article', 3),
  ('java-fundamentals', 'variables', 'Oracle Tutorial: Variables', 'https://docs.oracle.com/javase/tutorial/java/nutsandbolts/variables.html', 'docs', 1),
  ('java-fundamentals', 'variables', 'Local variable type inference (var) style guide', 'https://openjdk.org/projects/amber/guides/lvti-style-guide', 'article', 2),
  ('java-fundamentals', 'data-types', 'Oracle Tutorial: Primitive Data Types', 'https://docs.oracle.com/javase/tutorial/java/nutsandbolts/datatypes.html', 'docs', 1),
  ('java-fundamentals', 'data-types', 'What Every Programmer Should Know About Floating-Point', 'https://floating-point-gui.de/', 'article', 2),
  ('java-fundamentals', 'operators', 'Oracle Tutorial: Operators', 'https://docs.oracle.com/javase/tutorial/java/nutsandbolts/operators.html', 'docs', 1),
  ('java-fundamentals', 'conditions', 'Oracle Tutorial: The if-then and if-then-else Statements', 'https://docs.oracle.com/javase/tutorial/java/nutsandbolts/if.html', 'docs', 1),
  ('java-fundamentals', 'conditions', 'Guard clauses explained (Refactoring.guru)', 'https://refactoring.guru/replace-nested-conditional-with-guard-clauses', 'article', 2),
  ('java-fundamentals', 'switch', 'Switch Expressions and Statements (Java 21 docs)', 'https://docs.oracle.com/en/java/javase/21/language/switch-expressions-and-statements.html', 'docs', 1),
  ('java-fundamentals', 'switch', 'JEP 361: Switch Expressions', 'https://openjdk.org/jeps/361', 'article', 2),
  ('java-fundamentals', 'loops', 'Oracle Tutorial: The for Statement', 'https://docs.oracle.com/javase/tutorial/java/nutsandbolts/for.html', 'docs', 1),
  ('java-fundamentals', 'loops', 'Oracle Tutorial: while and do-while', 'https://docs.oracle.com/javase/tutorial/java/nutsandbolts/while.html', 'docs', 2),
  ('java-fundamentals', 'arrays', 'Oracle Tutorial: Arrays', 'https://docs.oracle.com/javase/tutorial/java/nutsandbolts/arrays.html', 'docs', 1),
  ('java-fundamentals', 'arrays', 'java.util.Arrays API reference', 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/Arrays.html', 'docs', 2),
  ('java-fundamentals', 'methods', 'Oracle Tutorial: Defining Methods', 'https://docs.oracle.com/javase/tutorial/java/javaOO/methods.html', 'docs', 1),
  ('java-fundamentals', 'methods', 'Is Java pass-by-value? (dev.java)', 'https://dev.java/learn/classes-objects/calling-methods-constructors/', 'article', 2),
  ('java-fundamentals', 'oop-basics', 'Oracle Tutorial: Object-Oriented Programming Concepts', 'https://docs.oracle.com/javase/tutorial/java/concepts/', 'docs', 1),
  ('java-fundamentals', 'oop-basics', 'Classes and Objects (dev.java)', 'https://dev.java/learn/classes-objects/', 'docs', 2),
  ('data-structures-algorithms', 'arrays', 'VisuAlgo — Array & list visualisations', 'https://visualgo.net/en/list', 'other', 1),
  ('data-structures-algorithms', 'arrays', 'Big-O Cheat Sheet', 'https://www.bigocheatsheet.com/', 'article', 2),
  ('data-structures-algorithms', 'strings', 'StringBuilder API reference', 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/StringBuilder.html', 'docs', 1),
  ('data-structures-algorithms', 'linked-lists', 'VisuAlgo — Linked List', 'https://visualgo.net/en/list', 'other', 1),
  ('data-structures-algorithms', 'stacks', 'ArrayDeque API reference', 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/ArrayDeque.html', 'docs', 1),
  ('data-structures-algorithms', 'queues', 'VisuAlgo — Queue & Deque', 'https://visualgo.net/en/list', 'other', 1),
  ('data-structures-algorithms', 'trees', 'VisuAlgo — Binary Search Tree', 'https://visualgo.net/en/bst', 'other', 1),
  ('data-structures-algorithms', 'graphs', 'VisuAlgo — Graph Traversal (DFS/BFS)', 'https://visualgo.net/en/dfsbfs', 'other', 1),
  ('data-structures-algorithms', 'sorting', 'VisuAlgo — Sorting', 'https://visualgo.net/en/sorting', 'other', 1),
  ('data-structures-algorithms', 'sorting', 'Sorting algorithms animated (Toptal)', 'https://www.toptal.com/developers/sorting-algorithms', 'video', 2),
  ('data-structures-algorithms', 'searching', 'Binary search — the lower bound template (cp-algorithms)', 'https://cp-algorithms.com/num_methods/binary_search.html', 'article', 1),
  ('dbms', 'sql-basics', 'PostgreSQL Tutorial: The SQL Language', 'https://www.postgresql.org/docs/current/tutorial-sql.html', 'docs', 1),
  ('dbms', 'sql-joins', 'PostgreSQL Tutorial: Joins Between Tables', 'https://www.postgresql.org/docs/current/tutorial-join.html', 'docs', 1),
  ('dbms', 'sql-joins', 'Visual guide to SQL joins', 'https://blog.codinghorror.com/a-visual-explanation-of-sql-joins/', 'article', 2),
  ('dbms', 'indexing', 'Use The Index, Luke', 'https://use-the-index-luke.com/', 'article', 1),
  ('dbms', 'transactions-acid', 'PostgreSQL: Transaction Isolation', 'https://www.postgresql.org/docs/current/transaction-iso.html', 'docs', 1),
  ('operating-systems', 'what-is-an-os', 'Operating Systems: Three Easy Pieces (free book)', 'https://pages.cs.wisc.edu/~remzi/OSTEP/', 'article', 1),
  ('operating-systems', 'synchronization', 'OSTEP — Locks chapter', 'https://pages.cs.wisc.edu/~remzi/OSTEP/threads-locks.pdf', 'article', 1),
  ('computer-networks', 'dns', 'What is DNS? (Cloudflare Learning)', 'https://www.cloudflare.com/learning/dns/what-is-dns/', 'article', 1),
  ('computer-networks', 'http-and-https', 'An overview of HTTP (MDN)', 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Overview', 'docs', 1),
  ('object-oriented-programming', 'design-patterns', 'Refactoring.guru — Design Patterns', 'https://refactoring.guru/design-patterns', 'article', 1),
  ('backend-development', 'nodejs-and-express', 'Express — Hello World', 'https://expressjs.com/en/starter/hello-world.html', 'docs', 1),
  ('backend-development', 'authentication', 'OWASP Password Storage Cheat Sheet', 'https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html', 'article', 1),
  ('frontend-development', 'semantic-html', 'MDN — HTML elements reference', 'https://developer.mozilla.org/en-US/docs/Web/HTML/Element', 'docs', 1),
  ('frontend-development', 'css-layout', 'CSS-Tricks — A Complete Guide to Flexbox', 'https://css-tricks.com/snippets/css/a-guide-to-flexbox/', 'article', 1),
  ('frontend-development', 'react-components', 'react.dev — Your First Component', 'https://react.dev/learn/your-first-component', 'docs', 1),
  ('frontend-development', 'state-and-hooks', 'react.dev — useState', 'https://react.dev/reference/react/useState', 'docs', 1),
  ('system-design', 'scalability-basics', 'The System Design Primer', 'https://github.com/donnemartin/system-design-primer', 'repo', 1),
  ('system-design', 'design-a-url-shortener', 'System Design Primer — Pastebin/bit.ly walkthrough', 'https://github.com/donnemartin/system-design-primer/blob/master/solutions/system_design/pastebin/README.md', 'repo', 1)
) as r(course_slug, lesson_slug, title, url, kind, position)
join public.courses c on c.slug = r.course_slug
join public.lessons l on l.course_id = c.id and l.slug = r.lesson_slug;

-- ---------------------------------------------------------------------------
-- 5. Roadmaps
-- One roadmap per learning_goal so onboarding always finds an exact match.
-- ---------------------------------------------------------------------------
insert into public.roadmaps (id, slug, title, summary, description, difficulty, estimated_weeks, goal, prerequisites, created_by, is_published, created_at) values
  ('55555555-0000-4000-8000-000000000001', 'full-stack-developer', 'Full Stack Developer',
   'From your first line of Java to designing scalable web apps.',
   $md$A complete path to becoming a **full stack developer**. You will build strong programming fundamentals in Java, learn object-oriented design, master the data structures and algorithms used in interviews, then build real backends, frontends and finally reason about systems at scale.

Plan for **8–10 hours per week**. Each section links to course lessons; completing a lesson automatically ticks off the matching topic.$md$,
   'beginner', 24, 'full_stack_developer',
   '{"Comfortable using a computer and installing software","High-school level math","8–10 hours per week"}',
   '11111111-0000-4000-8000-000000000001', true, now() - interval '81 days'),
  ('55555555-0000-4000-8000-000000000002', 'backend-developer', 'Backend Developer',
   'APIs, databases, networking and scalable server-side systems.',
   $md$For learners who can already program a little and want to specialise in the **server side**: Java, SQL, REST APIs, authentication, caching and the networking and system design knowledge backend interviews expect.$md$,
   'intermediate', 20, 'backend_developer',
   '{"Basic programming in any language","Comfort with the command line"}',
   '11111111-0000-4000-8000-000000000001', true, now() - interval '81 days'),
  ('55555555-0000-4000-8000-000000000003', 'cs-fundamentals', 'CS Fundamentals',
   'Operating systems, networks, databases and DSA — the core of computer science.',
   $md$The four pillars every software engineer is expected to know: **operating systems, computer networks, database systems and data structures & algorithms**. Ideal for CS students and for interview preparation.$md$,
   'beginner', 16, 'cs_fundamentals',
   '{"Can write simple programs (loops, functions)"}',
   '11111111-0000-4000-8000-000000000001', true, now() - interval '81 days'),
  ('55555555-0000-4000-8000-000000000004', 'frontend-developer', 'Frontend Developer',
   'HTML, CSS, JavaScript and React — build interfaces people love.',
   $md$Learn to build **accessible, responsive user interfaces**: semantic HTML, modern CSS layout, JavaScript and the DOM, React, plus the networking and DSA basics frontend interviews still ask about.$md$,
   'beginner', 16, 'frontend_developer',
   '{"Comfortable using a computer","A modern browser and code editor"}',
   '11111111-0000-4000-8000-000000000001', true, now() - interval '81 days'),
  ('55555555-0000-4000-8000-000000000005', 'software-developer', 'Software Developer',
   'A general-purpose path: programming, OOP, DSA and CS essentials.',
   $md$A balanced path for anyone aiming at a **software engineering role**: solid Java, object-oriented design, data structures and algorithms, and the OS and networking essentials.$md$,
   'beginner', 20, 'software_developer',
   '{"No prior experience required"}',
   '11111111-0000-4000-8000-000000000001', true, now() - interval '81 days'),
  ('55555555-0000-4000-8000-000000000006', 'data-engineer', 'Data Engineering Foundations',
   'SQL, data modelling, distributed data and pipelines.',
   $md$The foundations of **data engineering**: programming, deep SQL and data modelling, how databases scale, and the concepts behind batch and streaming pipelines.$md$,
   'intermediate', 18, 'data_engineer',
   '{"Basic programming","Comfort with spreadsheets or SQL"}',
   '11111111-0000-4000-8000-000000000001', true, now() - interval '81 days'),
  ('55555555-0000-4000-8000-000000000007', 'ai-engineer', 'AI Engineering Foundations',
   'Programming, DSA, APIs and the math and tools behind AI applications.',
   $md$Build the base you need to become an **AI engineer**: strong programming and DSA, backend APIs, the essential math, and how to build applications on top of LLM APIs and vector search.$md$,
   'intermediate', 20, 'ai_engineer',
   '{"Basic programming","High-school algebra"}',
   '11111111-0000-4000-8000-000000000001', true, now() - interval '81 days');

-- Helper: one section (linked to a course) + topics for the given lessons, in
-- order, followed by optional manual topics without a lesson.
create or replace function rookie_seed.section(
  p_roadmap uuid, p_section uuid, p_position int, p_title text, p_description text,
  p_course_slug text, p_lessons text[], p_manual text[] default '{}'
) returns void language plpgsql as $$
declare
  v_course uuid;
  v_n int;
begin
  select id into v_course from public.courses where slug = p_course_slug;
  insert into public.roadmap_nodes (id, roadmap_id, parent_id, kind, title, description, course_id, position)
  values (p_section, p_roadmap, null, 'section', p_title, p_description, v_course, p_position);

  insert into public.roadmap_nodes (roadmap_id, parent_id, kind, title, description, course_id, lesson_id, position)
  select p_roadmap, p_section, 'topic', l.title, l.summary, l.course_id, l.id, s.ord
  from unnest(p_lessons) with ordinality as s(slug, ord)
  join public.lessons l on l.course_id = v_course and l.slug = s.slug;

  get diagnostics v_n = row_count;
  if v_n <> coalesce(array_length(p_lessons, 1), 0) then
    raise exception 'roadmap section %: some lessons not found in %', p_title, p_course_slug;
  end if;

  insert into public.roadmap_nodes (roadmap_id, parent_id, kind, title, course_id, position)
  select p_roadmap, p_section, 'topic', m.title, null, coalesce(array_length(p_lessons, 1), 0) + m.ord
  from unnest(p_manual) with ordinality as m(title, ord);
end $$;

-- Full Stack Developer
select rookie_seed.section('55555555-0000-4000-8000-000000000001', '66666666-0001-4000-8000-000000000001', 1,
  'Programming Fundamentals', 'Syntax, types, control flow, arrays and methods in Java.', 'java-fundamentals',
  '{introduction-to-java,variables,data-types,operators,conditions,switch,loops,arrays,methods,oop-basics}');
select rookie_seed.section('55555555-0000-4000-8000-000000000001', '66666666-0001-4000-8000-000000000002', 2,
  'Object Oriented Programming', 'The four pillars, SOLID and design patterns.', 'object-oriented-programming',
  '{classes-and-objects,encapsulation,inheritance,polymorphism,abstraction-and-interfaces,solid-principles,design-patterns}');
select rookie_seed.section('55555555-0000-4000-8000-000000000001', '66666666-0001-4000-8000-000000000003', 3,
  'Data Structures', 'Linear and non-linear data structures.', 'data-structures-algorithms',
  '{arrays,strings,linked-lists,stacks,queues,trees,graphs}', '{"Hash maps & sets"}');
select rookie_seed.section('55555555-0000-4000-8000-000000000001', '66666666-0001-4000-8000-000000000004', 4,
  'Algorithms', 'Sorting, searching and problem-solving techniques.', 'data-structures-algorithms',
  '{sorting,searching}', '{"Recursion & backtracking","Dynamic programming basics"}');
select rookie_seed.section('55555555-0000-4000-8000-000000000001', '66666666-0001-4000-8000-000000000005', 5,
  'Databases', 'Relational modelling, SQL, transactions and indexes.', 'dbms',
  '{introduction-to-dbms,relational-model-keys,er-modeling,sql-basics,sql-joins,normalization,transactions-acid,indexing}');
select rookie_seed.section('55555555-0000-4000-8000-000000000001', '66666666-0001-4000-8000-000000000006', 6,
  'Backend Development', 'REST APIs, auth, persistence, caching and deployment.', 'backend-development',
  '{rest-api-design,nodejs-and-express,authentication,databases-and-orms,caching,testing-and-deployment}');
select rookie_seed.section('55555555-0000-4000-8000-000000000001', '66666666-0001-4000-8000-000000000007', 7,
  'Frontend Development', 'HTML, CSS, the DOM and React.', 'frontend-development',
  '{semantic-html,css-layout,javascript-and-the-dom,react-components,state-and-hooks,data-fetching}', '{"Build and deploy a portfolio project"}');
select rookie_seed.section('55555555-0000-4000-8000-000000000001', '66666666-0001-4000-8000-000000000008', 8,
  'System Design', 'Designing systems that scale.', 'system-design',
  '{scalability-basics,load-balancing,caching-strategies,database-scaling,message-queues,design-a-url-shortener}');

-- Backend Developer
select rookie_seed.section('55555555-0000-4000-8000-000000000002', '66666666-0002-4000-8000-000000000001', 1,
  'Core Java', 'The language features backend code relies on.', 'java-fundamentals', '{methods,oop-basics}');
select rookie_seed.section('55555555-0000-4000-8000-000000000002', '66666666-0002-4000-8000-000000000002', 2,
  'Databases & SQL', 'Query and model data like a pro.', 'dbms', '{sql-basics,sql-joins,normalization,transactions-acid,indexing}');
select rookie_seed.section('55555555-0000-4000-8000-000000000002', '66666666-0002-4000-8000-000000000003', 3,
  'Networking', 'What happens between client and server.', 'computer-networks', '{tcp-vs-udp,dns,http-and-https}');
select rookie_seed.section('55555555-0000-4000-8000-000000000002', '66666666-0002-4000-8000-000000000004', 4,
  'Building APIs', 'From REST design to production.', 'backend-development',
  '{rest-api-design,nodejs-and-express,authentication,databases-and-orms,caching,testing-and-deployment}');
select rookie_seed.section('55555555-0000-4000-8000-000000000002', '66666666-0002-4000-8000-000000000005', 5,
  'Scaling the Backend', 'Load balancing, caching and async work.', 'system-design',
  '{scalability-basics,load-balancing,caching-strategies,database-scaling,message-queues}');

-- CS Fundamentals
select rookie_seed.section('55555555-0000-4000-8000-000000000003', '66666666-0003-4000-8000-000000000001', 1,
  'Operating Systems', 'Processes, scheduling, concurrency and memory.', 'operating-systems',
  '{what-is-an-os,processes-and-threads,cpu-scheduling,synchronization,deadlocks,virtual-memory}');
select rookie_seed.section('55555555-0000-4000-8000-000000000003', '66666666-0003-4000-8000-000000000002', 2,
  'Computer Networks', 'Layers, addressing and protocols.', 'computer-networks',
  '{osi-and-tcp-ip,ip-addressing-subnetting,tcp-vs-udp,dns,http-and-https}');
select rookie_seed.section('55555555-0000-4000-8000-000000000003', '66666666-0003-4000-8000-000000000003', 3,
  'Database Systems', 'Relational theory to transactions.', 'dbms',
  '{introduction-to-dbms,relational-model-keys,er-modeling,sql-basics,sql-joins,normalization,transactions-acid,indexing}');
select rookie_seed.section('55555555-0000-4000-8000-000000000003', '66666666-0003-4000-8000-000000000004', 4,
  'Data Structures & Algorithms', 'The problem-solving toolkit.', 'data-structures-algorithms',
  '{arrays,strings,linked-lists,stacks,queues,trees,graphs,sorting,searching}');

-- Frontend Developer
select rookie_seed.section('55555555-0000-4000-8000-000000000004', '66666666-0004-4000-8000-000000000001', 1,
  'Web Foundations', 'HTML, CSS and JavaScript.', 'frontend-development', '{semantic-html,css-layout,javascript-and-the-dom}');
select rookie_seed.section('55555555-0000-4000-8000-000000000004', '66666666-0004-4000-8000-000000000002', 2,
  'React', 'Components, state and data.', 'frontend-development', '{react-components,state-and-hooks,data-fetching}',
  '{"TypeScript for React","Accessibility audit of your app"}');
select rookie_seed.section('55555555-0000-4000-8000-000000000004', '66666666-0004-4000-8000-000000000003', 3,
  'How the Web Works', 'DNS and HTTP for frontend developers.', 'computer-networks', '{dns,http-and-https}');
select rookie_seed.section('55555555-0000-4000-8000-000000000004', '66666666-0004-4000-8000-000000000004', 4,
  'Interview DSA', 'The essentials for frontend interviews.', 'data-structures-algorithms', '{arrays,strings,trees}');

-- Software Developer
select rookie_seed.section('55555555-0000-4000-8000-000000000005', '66666666-0005-4000-8000-000000000001', 1,
  'Programming in Java', 'Write correct, readable programs.', 'java-fundamentals',
  '{introduction-to-java,variables,data-types,operators,conditions,switch,loops,arrays,methods,oop-basics}');
select rookie_seed.section('55555555-0000-4000-8000-000000000005', '66666666-0005-4000-8000-000000000002', 2,
  'Object Oriented Design', 'Design maintainable code.', 'object-oriented-programming',
  '{classes-and-objects,encapsulation,inheritance,polymorphism,abstraction-and-interfaces,solid-principles}');
select rookie_seed.section('55555555-0000-4000-8000-000000000005', '66666666-0005-4000-8000-000000000003', 3,
  'Data Structures & Algorithms', 'Problem solving for interviews and beyond.', 'data-structures-algorithms',
  '{arrays,strings,linked-lists,stacks,queues,trees,graphs,sorting,searching}');
select rookie_seed.section('55555555-0000-4000-8000-000000000005', '66666666-0005-4000-8000-000000000004', 4,
  'Systems Essentials', 'How programs run and talk to each other.', 'operating-systems',
  '{processes-and-threads,synchronization,virtual-memory}');

-- Data Engineering Foundations
select rookie_seed.section('55555555-0000-4000-8000-000000000006', '66666666-0006-4000-8000-000000000001', 1,
  'Programming Basics', 'Enough programming to automate anything.', 'java-fundamentals',
  '{introduction-to-java,variables,data-types,conditions,loops,arrays,methods}', '{"Python for data work"}');
select rookie_seed.section('55555555-0000-4000-8000-000000000006', '66666666-0006-4000-8000-000000000002', 2,
  'SQL & Data Modelling', 'The language of data.', 'dbms',
  '{introduction-to-dbms,relational-model-keys,er-modeling,sql-basics,sql-joins,normalization,transactions-acid,indexing}');
select rookie_seed.section('55555555-0000-4000-8000-000000000006', '66666666-0006-4000-8000-000000000003', 3,
  'Data at Scale', 'Distributed storage and messaging.', 'system-design', '{database-scaling,message-queues}',
  '{"Batch vs streaming pipelines","Data warehouses & columnar storage","Orchestration with Airflow"}');
select rookie_seed.section('55555555-0000-4000-8000-000000000006', '66666666-0006-4000-8000-000000000004', 4,
  'Algorithms for Data', 'Sorting and searching large datasets.', 'data-structures-algorithms', '{arrays,sorting,searching}');

-- AI Engineering Foundations
select rookie_seed.section('55555555-0000-4000-8000-000000000007', '66666666-0007-4000-8000-000000000001', 1,
  'Programming Foundations', 'Write clean, testable code.', 'java-fundamentals',
  '{introduction-to-java,variables,conditions,loops,arrays,methods,oop-basics}', '{"Python & NumPy essentials"}');
select rookie_seed.section('55555555-0000-4000-8000-000000000007', '66666666-0007-4000-8000-000000000002', 2,
  'Data Structures & Algorithms', 'Reason about performance.', 'data-structures-algorithms',
  '{arrays,strings,trees,graphs,sorting,searching}', '{"Linear algebra refresher","Probability & statistics basics"}');
select rookie_seed.section('55555555-0000-4000-8000-000000000007', '66666666-0007-4000-8000-000000000003', 3,
  'Serving AI Features', 'APIs and production concerns.', 'backend-development',
  '{rest-api-design,nodejs-and-express,caching}',
  '{"Working with LLM APIs","Embeddings & vector search","Evaluating AI features"}');

-- Students' primary roadmap
update public.profiles p
   set primary_roadmap_id = r.id
  from public.roadmaps r
 where r.goal = p.learning_goal and p.id::text like '11111111-%' and p.role = 'student';

-- ---------------------------------------------------------------------------
-- 6. Achievement definitions (must exist before any activity is generated)
-- ---------------------------------------------------------------------------
insert into public.achievements (code, title, description, icon, criteria, position) values
  ('first_lesson',       'First Steps',        'Complete your first lesson.',                         '🎯', '{"kind":"count","activity":"lesson_completed","threshold":1}', 1),
  ('lessons_10',         'Bookworm',           'Complete 10 lessons.',                                '📖', '{"kind":"count","activity":"lesson_completed","threshold":10}', 2),
  ('streak_7',           'On Fire',            'Keep a 7-day learning streak.',                       '🔥', '{"kind":"streak","threshold":7}', 3),
  ('streak_30',          'Unstoppable',        'Keep a 30-day learning streak.',                      '⚡', '{"kind":"streak","threshold":30}', 4),
  ('first_problem',      'Hello, World',       'Solve your first coding problem.',                    '💻', '{"kind":"count","activity":"problem_solved","threshold":1}', 5),
  ('problems_10',        'Problem Solver',     'Solve 10 coding problems.',                           '🧠', '{"kind":"count","activity":"problem_solved","threshold":10}', 6),
  ('problems_50',        'Code Champion',      'Solve 50 coding problems.',                           '🏆', '{"kind":"count","activity":"problem_solved","threshold":50}', 7),
  ('first_course',       'Course Complete',    'Finish every lesson in a course.',                    '📚', '{"kind":"count","activity":"course_completed","threshold":1}', 8),
  ('first_assignment',   'Turned In',          'Submit your first assignment.',                       '📝', '{"kind":"count","activity":"assignment_submitted","threshold":1}', 9),
  ('first_class',        'Present!',           'Attend your first live class.',                       '🙋', '{"kind":"count","activity":"class_attended","threshold":1}', 10),
  ('perfect_attendance', 'Perfect Attendance', 'Attend 100% of at least 5 classes.',                  '🎓', '{"kind":"attendance_rate","threshold":100,"min_classes":5}', 11),
  ('roadmap_node_10',    'Trailblazer',        'Complete 10 roadmap topics.',                         '🗺️', '{"kind":"count","activity":"roadmap_node_completed","threshold":10}', 12)
on conflict (code) do update
  set title = excluded.title, description = excluded.description, icon = excluded.icon,
      criteria = excluded.criteria, position = excluded.position;

-- ---------------------------------------------------------------------------
-- 7. Enrollments (before classes/assignments/announcements so their
--    notification fan-out reaches students, and before progress so roadmap
--    topic completion is logged)
-- ---------------------------------------------------------------------------
insert into public.roadmap_enrollments (user_id, roadmap_id, started_at)
select p.id, p.primary_roadmap_id, p.created_at + interval '20 minutes'
from public.profiles p
where p.id::text like '11111111-%' and p.role = 'student' and p.primary_roadmap_id is not null;

-- Same rule as enroll_in_roadmap(): every course referenced by the roadmap.
insert into public.course_enrollments (user_id, course_id, enrolled_at)
select distinct e.user_id, n.course_id, e.started_at + interval '10 minutes'
from public.roadmap_enrollments e
join public.roadmap_nodes n on n.roadmap_id = e.roadmap_id and n.course_id is not null
where e.user_id::text like '11111111-%'
on conflict do nothing;

-- A few extra electives
insert into public.course_enrollments (user_id, course_id, enrolled_at) values
  ('11111111-0000-4000-8000-000000000011', '22222222-0000-4000-8000-000000000004', now() - interval '40 days'),  -- Priya → OS
  ('11111111-0000-4000-8000-000000000013', '22222222-0000-4000-8000-000000000001', now() - interval '30 days'),  -- Sofia → Java
  ('11111111-0000-4000-8000-000000000014', '22222222-0000-4000-8000-000000000001', now() - interval '45 days')   -- Kenji → Java
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- 8. Classes
--   past (completed) over the last ~5 weeks, one live right now, two more
--   today, tomorrow 10:00 "Java — Loops", and more over the next two weeks.
-- ---------------------------------------------------------------------------
insert into public.classes (id, title, description, agenda, course_id, instructor_id, starts_at, duration_minutes,
                            meeting_url, recording_url, resources, status, created_at)
select k.id::uuid, k.title, k.description, k.agenda, c.id, k.instructor::uuid, k.starts_at, k.duration,
       k.meeting_url, k.recording_url, k.resources::jsonb,
       coalesce(k.status,
         case when now() >= k.starts_at + make_interval(mins => k.duration) then 'completed'
              when now() >= k.starts_at then 'live'
              else 'scheduled' end)::public.class_status,
       least(k.starts_at - interval '7 days', now() - interval '1 day')
from (values
  -- ----- past -----
  ('88888888-0000-4000-8000-000000000001', 'Java — Welcome & JDK Setup', 'Kick-off session: how the course works, installing the JDK and an editor, and running our first program together.',
   $md$1. Course overview & how to use Rookie
2. Installing JDK 21 and VS Code / IntelliJ
3. Live coding: Hello World, compile & run
4. Q&A$md$, 'java-fundamentals', '11111111-0000-4000-8000-000000000002', rookie_seed.slot(-33, 10), 60,
   'https://meet.google.com/jvf-wlcm-set', 'https://recordings.rookie.dev/java-welcome-setup', '[{"title":"Slides: Welcome to Java","url":"https://rookie.dev/slides/java-01"},{"title":"Adoptium JDK downloads","url":"https://adoptium.net/"}]', 'completed'),
  ('88888888-0000-4000-8000-000000000002', 'DSA — Big-O & Arrays', 'Why complexity matters, how to count operations, and array fundamentals.',
   $md$1. Measuring algorithms: Big-O, Ω, Θ
2. Arrays in memory
3. Prefix sums & two pointers
4. Practice: Two Sum$md$, 'data-structures-algorithms', '11111111-0000-4000-8000-000000000003', rookie_seed.slot(-31, 14), 90,
   'https://meet.google.com/dsa-bgoa-rrs', 'https://recordings.rookie.dev/dsa-big-o-arrays', '[{"title":"Big-O Cheat Sheet","url":"https://www.bigocheatsheet.com/"}]', 'completed'),
  ('88888888-0000-4000-8000-000000000003', 'Java — Variables & Data Types', 'Primitives, references, casting and the classic overflow surprises.',
   $md$1. Declaring variables, `final` and `var`
2. The eight primitive types
3. Casting and overflow — live demo
4. Exercise walkthrough$md$, 'java-fundamentals', '11111111-0000-4000-8000-000000000002', rookie_seed.slot(-28, 10), 60,
   'https://meet.google.com/jvf-vars-dtp', 'https://recordings.rookie.dev/java-variables-types', '[]', 'completed'),
  ('88888888-0000-4000-8000-000000000004', 'DBMS — The Relational Model', 'Tables, keys and relationships — the foundation of every SQL database.',
   $md$1. Why not just files?
2. Relations, tuples, attributes
3. Primary & foreign keys
4. Sketching our first ER diagram$md$, 'dbms', '11111111-0000-4000-8000-000000000003', rookie_seed.slot(-26, 14), 60,
   'https://meet.google.com/dbm-rltn-mdl', null, '[{"title":"PostgreSQL tutorial","url":"https://www.postgresql.org/docs/current/tutorial.html"}]', 'completed'),
  ('88888888-0000-4000-8000-000000000005', 'OS — Processes & Threads', 'What a process really is, and how threads share its memory.',
   $md$1. Process states and the PCB
2. fork/exec demo
3. Threads vs processes
4. Context switching costs$md$, 'operating-systems', '11111111-0000-4000-8000-000000000002', rookie_seed.slot(-24, 16), 60,
   'https://meet.google.com/osp-rcth-rds', 'https://recordings.rookie.dev/os-processes-threads', '[]', 'completed'),
  ('88888888-0000-4000-8000-000000000006', 'Java — Operators & Expressions', 'Arithmetic, logical operators, precedence and the ternary operator.',
   $md$1. Integer vs floating-point division
2. `++i` vs `i++`
3. Short-circuit evaluation
4. Mini challenge: seconds → hh:mm:ss$md$, 'java-fundamentals', '11111111-0000-4000-8000-000000000002', rookie_seed.slot(-21, 10), 60,
   'https://meet.google.com/jvf-oprs-exp', 'https://recordings.rookie.dev/java-operators', '[]', 'completed'),
  ('88888888-0000-4000-8000-000000000007', 'DSA — Strings & Two Pointers', 'Immutability, StringBuilder, frequency arrays and the two-pointer pattern.',
   $md$1. Why `s += x` in a loop is O(n²)
2. Frequency counting
3. Two pointers: palindromes
4. Practice: Valid Anagram$md$, 'data-structures-algorithms', '11111111-0000-4000-8000-000000000003', rookie_seed.slot(-19, 14), 90,
   'https://meet.google.com/dsa-strs-tpt', 'https://recordings.rookie.dev/dsa-strings', '[]', 'completed'),
  ('88888888-0000-4000-8000-000000000008', 'CN — The TCP/IP Model', 'Layers, encapsulation and a packet''s journey across the internet.',
   $md$1. OSI vs TCP/IP
2. Encapsulation walkthrough
3. Wireshark demo$md$, 'computer-networks', '11111111-0000-4000-8000-000000000003', rookie_seed.slot(-17, 16), 60,
   'https://meet.google.com/cnt-cpip-mdl', null, '[]', 'completed'),
  ('88888888-0000-4000-8000-000000000018', 'OOP — Classes & Objects', 'Modelling real things as classes, constructors and encapsulation.',
   $md$1. Class vs object
2. Constructors and `this`
3. Encapsulation: private fields + methods
4. Build a BankAccount together$md$, 'object-oriented-programming', '11111111-0000-4000-8000-000000000002', rookie_seed.slot(-16, 11), 60,
   'https://meet.google.com/oop-clss-obj', 'https://recordings.rookie.dev/oop-classes-objects', '[]', 'completed'),
  ('88888888-0000-4000-8000-000000000009', 'Java — Conditionals', 'if/else chains, combining conditions and guard clauses.',
   $md$1. `if` / `else if` / `else`
2. Ordering conditions correctly
3. Guard clauses
4. Exercise: leap years$md$, 'java-fundamentals', '11111111-0000-4000-8000-000000000002', rookie_seed.slot(-14, 10), 60,
   'https://meet.google.com/jvf-cndt-ifs', 'https://recordings.rookie.dev/java-conditionals', '[]', 'completed'),
  ('88888888-0000-4000-8000-000000000010', 'DBMS — SQL Basics', 'SELECT, WHERE, GROUP BY and aggregates on a real dataset.',
   $md$1. SELECT / WHERE / ORDER BY
2. Aggregates and GROUP BY
3. HAVING vs WHERE
4. Practice queries$md$, 'dbms', '11111111-0000-4000-8000-000000000003', rookie_seed.slot(-12, 14), 60,
   'https://meet.google.com/dbm-sqlb-scs', 'https://recordings.rookie.dev/dbms-sql-basics', '[]', 'completed'),
  ('88888888-0000-4000-8000-000000000011', 'Frontend — HTML & CSS Layout', 'Semantic HTML and responsive layouts with Flexbox and Grid.',
   $md$1. Semantic elements & accessibility
2. Flexbox in 15 minutes
3. Grid for page layouts
4. Build a responsive card grid$md$, 'frontend-development', '11111111-0000-4000-8000-000000000003', rookie_seed.slot(-10, 16), 75,
   'https://meet.google.com/fed-html-css', null, '[{"title":"Flexbox Froggy","url":"https://flexboxfroggy.com/"}]', 'completed'),
  ('88888888-0000-4000-8000-000000000017', 'System Design — Scalability 101', 'Vertical vs horizontal scaling and back-of-the-envelope estimates.',
   $md$1. Latency vs throughput
2. Vertical vs horizontal scaling
3. Estimating QPS and storage$md$, 'system-design', '11111111-0000-4000-8000-000000000003', rookie_seed.slot(-9, 15), 60,
   'https://meet.google.com/sds-clbt-one', 'https://recordings.rookie.dev/sd-scalability-101', '[]', 'completed'),
  ('88888888-0000-4000-8000-000000000012', 'OOP — Inheritance & Polymorphism', 'extends, super, overriding and dynamic dispatch.',
   $md$1. Inheritance done right (is-a)
2. Overriding and `super`
3. Polymorphism and dynamic dispatch
4. Composition over inheritance$md$, 'object-oriented-programming', '11111111-0000-4000-8000-000000000002', rookie_seed.slot(-6, 11), 60,
   'https://meet.google.com/oop-inht-ply', 'https://recordings.rookie.dev/oop-inheritance', '[]', 'completed'),
  ('88888888-0000-4000-8000-000000000013', 'Java — Switch Statements & Expressions', 'Classic switch, fall-through, and modern arrow-style switch expressions.',
   $md$1. Classic `switch` and `break`
2. Intentional vs accidental fall-through
3. Switch expressions and `yield`
4. Exercise: calculator$md$, 'java-fundamentals', '11111111-0000-4000-8000-000000000002', rookie_seed.slot(-4, 10), 60,
   'https://meet.google.com/jvf-swch-exp', 'https://recordings.rookie.dev/java-switch', '[]', 'completed'),
  ('88888888-0000-4000-8000-000000000016', 'DSA — Stacks & Queues', 'LIFO and FIFO structures and the problems they solve.',
   $md$1. Stack & queue APIs (ArrayDeque)
2. Valid Parentheses walkthrough
3. Monotonic stack intro
4. BFS preview$md$, 'data-structures-algorithms', '11111111-0000-4000-8000-000000000003', rookie_seed.slot(-3, 14), 90,
   'https://meet.google.com/dsa-stck-que', 'https://recordings.rookie.dev/dsa-stacks-queues', '[]', 'completed'),
  ('88888888-0000-4000-8000-000000000015', 'Backend — REST API Design', 'Designing clean, predictable HTTP APIs.',
   $md$1. Resources and verbs
2. Status codes that mean something
3. Pagination & versioning
4. Review: design a todo API$md$, 'backend-development', '11111111-0000-4000-8000-000000000002', rookie_seed.slot(-2, 16), 60,
   'https://meet.google.com/bkd-rest-apd', null, '[]', 'completed'),
  ('88888888-0000-4000-8000-000000000014', 'DBMS — SQL Joins Workshop', 'Hands-on: INNER, LEFT and anti-joins on the Rookie sample schema.',
   $md$1. Join types with Venn-free diagrams
2. LEFT JOIN + COUNT pitfalls
3. Anti-joins
4. Workshop exercises$md$, 'dbms', '11111111-0000-4000-8000-000000000003', rookie_seed.slot(-1, 14), 60,
   'https://meet.google.com/dbm-join-wks', 'https://recordings.rookie.dev/dbms-joins-workshop', '[{"title":"PostgreSQL: Joins Between Tables","url":"https://www.postgresql.org/docs/current/tutorial-join.html"}]', 'completed'),
  -- ----- today -----
  ('88888888-0000-4000-8000-000000000021', 'Java — Arrays Lab', 'Hands-on lab: iterating, reversing and searching arrays.',
   $md$1. Quick recap of loops
2. Array traversal patterns
3. In-place reversal
4. `java.util.Arrays` helpers
5. Lab time with mentors$md$, 'java-fundamentals', '11111111-0000-4000-8000-000000000002', rookie_seed.slot(0, 10), 60,
   'https://meet.google.com/jvf-arry-lab', null, '[{"title":"Oracle Tutorial: Arrays","url":"https://docs.oracle.com/javase/tutorial/java/nutsandbolts/arrays.html"}]', null),
  ('88888888-0000-4000-8000-000000000019', 'DSA — Trees & Traversals', 'Binary trees, the four traversals and thinking recursively.',
   $md$1. Tree vocabulary
2. Pre/in/post-order (recursive)
3. Level order with a queue
4. Practice: Maximum Depth$md$, 'data-structures-algorithms', '11111111-0000-4000-8000-000000000003', now() - interval '20 minutes', 90,
   'https://meet.google.com/dsa-tree-trv', null, '[{"title":"VisuAlgo — BST","url":"https://visualgo.net/en/bst"}]', 'live'),
  ('88888888-0000-4000-8000-000000000020', 'System Design — Caching Patterns', 'Cache-aside, write-through, eviction and invalidation.',
   $md$1. Where caches live
2. Cache-aside vs write-through
3. TTLs and eviction policies
4. Case study: caching course pages$md$, 'system-design', '11111111-0000-4000-8000-000000000003',
   greatest(rookie_seed.slot(0, 15), least(now() + interval '90 minutes', rookie_seed.slot(0, 23.5))), 60,
   'https://meet.google.com/sds-cach-pat', null, '[]', 'scheduled'),
  -- ----- upcoming -----
  ('88888888-0000-4000-8000-000000000022', 'Java — Loops', 'for, while, do-while and for-each, plus the bugs they usually come with.',
   $md$1. Counted loops with `for`
2. `while` and `do-while`
3. for-each over arrays
4. `break` / `continue`
5. Exercise: multiplication tables & digit sums$md$, 'java-fundamentals', '11111111-0000-4000-8000-000000000002', rookie_seed.slot(1, 10), 60,
   'https://meet.google.com/jvf-lops-ctl', null, '[{"title":"Oracle Tutorial: The for Statement","url":"https://docs.oracle.com/javase/tutorial/java/nutsandbolts/for.html"}]', 'scheduled'),
  ('88888888-0000-4000-8000-000000000031', 'CN — Subnetting Practice', 'Practice session on CIDR and subnet calculations.',
   $md$1. CIDR refresher
2. 10 subnetting drills$md$, 'computer-networks', '11111111-0000-4000-8000-000000000003', rookie_seed.slot(1, 18), 60,
   'https://meet.google.com/cnt-sbnt-prc', null, '[]', 'cancelled'),
  ('88888888-0000-4000-8000-000000000024', 'DSA — Graphs: BFS & DFS', 'Graph representations and the two fundamental traversals.',
   $md$1. Adjacency list vs matrix
2. DFS (recursive & iterative)
3. BFS and shortest paths
4. Number of islands$md$, 'data-structures-algorithms', '11111111-0000-4000-8000-000000000003', rookie_seed.slot(2, 14), 90,
   'https://meet.google.com/dsa-grph-bfs', null, '[{"title":"VisuAlgo — DFS/BFS","url":"https://visualgo.net/en/dfsbfs"}]', 'scheduled'),
  ('88888888-0000-4000-8000-000000000023', 'Java — Methods & Recursion', 'Writing reusable methods, overloading and your first recursive functions.',
   $md$1. Method anatomy
2. Pass-by-value explained
3. Overloading
4. Recursion: factorial & Fibonacci$md$, 'java-fundamentals', '11111111-0000-4000-8000-000000000002', rookie_seed.slot(3, 11), 60,
   'https://meet.google.com/jvf-mthd-rec', null, '[]', 'scheduled'),
  ('88888888-0000-4000-8000-000000000025', 'DBMS — Transactions & ACID', 'What BEGIN/COMMIT really guarantee, and isolation levels.',
   $md$1. ACID by example
2. Isolation anomalies demo
3. Choosing an isolation level$md$, 'dbms', '11111111-0000-4000-8000-000000000003', rookie_seed.slot(4, 13), 60,
   'https://meet.google.com/dbm-acid-txn', null, '[]', 'scheduled'),
  ('88888888-0000-4000-8000-000000000030', 'Career AMA: Breaking into Tech', 'Open session for all students — resumes, portfolios and interview prep. Bring your questions!',
   $md$1. How hiring works at startups vs big tech
2. Portfolio projects that stand out
3. Open Q&A$md$, null, '11111111-0000-4000-8000-000000000001', rookie_seed.slot(5, 17), 60,
   'https://meet.google.com/crr-amaa-tch', null, '[]', 'scheduled'),
  ('88888888-0000-4000-8000-000000000026', 'Backend — Authentication with JWT', 'Password hashing, sessions vs JWTs and protecting routes.',
   $md$1. bcrypt and why slow hashing matters
2. Sessions vs JWT
3. Express middleware for auth
4. Role-based access$md$, 'backend-development', '11111111-0000-4000-8000-000000000002', rookie_seed.slot(6, 15), 75,
   'https://meet.google.com/bkd-auth-jwt', null, '[]', 'scheduled'),
  ('88888888-0000-4000-8000-000000000027', 'Frontend — React State & Effects', 'useState, useEffect and lifting state up.',
   $md$1. State vs props
2. useState pitfalls
3. useEffect and cleanup
4. Build a filterable course list$md$, 'frontend-development', '11111111-0000-4000-8000-000000000003', rookie_seed.slot(8, 10), 75,
   'https://meet.google.com/fed-rect-stt', null, '[]', 'scheduled'),
  ('88888888-0000-4000-8000-000000000028', 'System Design — Design a URL Shortener', 'End-to-end design exercise in interview format.',
   $md$1. Requirements & estimates
2. API and data model
3. Key generation
4. Scaling reads with caches$md$, 'system-design', '11111111-0000-4000-8000-000000000003', rookie_seed.slot(10, 16), 90,
   'https://meet.google.com/sds-urls-hrt', null, '[]', 'scheduled'),
  ('88888888-0000-4000-8000-000000000029', 'OS — Deadlocks', 'Coffman conditions, lock ordering and detection.',
   $md$1. Dining philosophers
2. The four conditions
3. Prevention via lock ordering$md$, 'operating-systems', '11111111-0000-4000-8000-000000000002', rookie_seed.slot(12, 10), 60,
   'https://meet.google.com/osd-dlck-cnd', null, '[]', 'scheduled')
) as k(id, title, description, agenda, course_slug, instructor, starts_at, duration, meeting_url, recording_url, resources, status)
left join public.courses c on c.slug = k.course_slug;

-- ---------------------------------------------------------------------------
-- 9. Attendance for completed classes
-- ---------------------------------------------------------------------------
-- Vaiju: 16 classes → 13 present/late, 2 absent, 1 excused  ≈ 87 %
insert into public.attendance (class_id, user_id, status, note, marked_by, created_at)
select k.id, '11111111-0000-4000-8000-000000000010', a.status::public.attendance_status, a.note, k.instructor_id,
       k.starts_at + make_interval(mins => k.duration_minutes)
from (values
  ('88888888-0000-4000-8000-000000000001', 'present', null),
  ('88888888-0000-4000-8000-000000000002', 'present', null),
  ('88888888-0000-4000-8000-000000000003', 'present', null),
  ('88888888-0000-4000-8000-000000000004', 'absent',  null),
  ('88888888-0000-4000-8000-000000000006', 'present', null),
  ('88888888-0000-4000-8000-000000000007', 'late',    'Joined 15 minutes late'),
  ('88888888-0000-4000-8000-000000000018', 'present', null),
  ('88888888-0000-4000-8000-000000000009', 'present', null),
  ('88888888-0000-4000-8000-000000000010', 'absent',  null),
  ('88888888-0000-4000-8000-000000000011', 'excused', 'Medical appointment — informed in advance'),
  ('88888888-0000-4000-8000-000000000017', 'present', null),
  ('88888888-0000-4000-8000-000000000012', 'present', null),
  ('88888888-0000-4000-8000-000000000013', 'present', null),
  ('88888888-0000-4000-8000-000000000016', 'present', null),
  ('88888888-0000-4000-8000-000000000015', 'present', null),
  ('88888888-0000-4000-8000-000000000014', 'present', null)
) as a(class_id, status, note)
join public.classes k on k.id = a.class_id::uuid;

-- Everyone else: deterministic pseudo-random statuses around a per-student rate,
-- only for classes after they enrolled in the course.
insert into public.attendance (class_id, user_id, status, marked_by, created_at)
select k.id, e.user_id,
       (case
          when h < r.rate - 8 then 'present'
          when h < r.rate     then 'late'
          when h < r.rate + 4 then 'excused'
          else 'absent' end)::public.attendance_status,
       k.instructor_id, k.starts_at + make_interval(mins => k.duration_minutes)
from public.classes k
join public.course_enrollments e on e.course_id = k.course_id and e.enrolled_at < k.starts_at
join (values
  ('11111111-0000-4000-8000-000000000011', 96), ('11111111-0000-4000-8000-000000000012', 84),
  ('11111111-0000-4000-8000-000000000013', 78), ('11111111-0000-4000-8000-000000000014', 92),
  ('11111111-0000-4000-8000-000000000015', 72), ('11111111-0000-4000-8000-000000000016', 88),
  ('11111111-0000-4000-8000-000000000017', 90), ('11111111-0000-4000-8000-000000000018', 100)
) as r(user_id, rate) on r.user_id::uuid = e.user_id
cross join lateral (select abs(hashtext(e.user_id::text || k.id::text)::bigint) % 100 as h) hh
where k.id::text like '88888888-%' and k.status = 'completed';

-- ---------------------------------------------------------------------------
-- 10. Lesson progress
-- ---------------------------------------------------------------------------
-- Vaiju — timestamps chosen so activity covers the last 7 days (today
-- included) with a gap 7 days ago → current streak 7.
insert into public.student_progress (user_id, lesson_id, status, completed_at, last_viewed_at, created_at)
select '11111111-0000-4000-8000-000000000010', l.id, p.status::public.progress_status,
       case when p.status = 'completed' then rookie_seed.ago(p.days_ago, p.hours) end,
       rookie_seed.ago(p.days_ago, p.hours),
       rookie_seed.ago(p.days_ago, p.hours) - interval '35 minutes'
from (values
  ('java-fundamentals',          'introduction-to-java',  'completed',   9,  9.5),
  ('java-fundamentals',          'variables',             'completed',   8, 10.0),
  ('java-fundamentals',          'data-types',            'completed',   8, 19.0),
  ('java-fundamentals',          'operators',             'completed',   6, 18.0),
  ('java-fundamentals',          'conditions',            'completed',   5, 19.0),
  ('java-fundamentals',          'switch',                'completed',   4, 20.0),
  ('java-fundamentals',          'loops',                 'completed',   3, 18.5),
  ('data-structures-algorithms', 'arrays',                'completed',   5, 21.0),
  ('data-structures-algorithms', 'strings',               'completed',   2, 20.0),
  ('dbms',                       'introduction-to-dbms',  'completed',   1, 19.0),
  ('dbms',                       'relational-model-keys', 'completed',   0,  0.75),
  ('java-fundamentals',          'arrays',                'in_progress', 0,  1.0),
  ('data-structures-algorithms', 'linked-lists',          'in_progress', 1, 21.5)
) as p(course_slug, lesson_slug, status, days_ago, hours)
join public.courses c on c.slug = p.course_slug
join public.lessons l on l.course_id = c.id and l.slug = p.lesson_slug;

-- Helper: complete the first p_count lessons of a course (in course order),
-- spread evenly between p_from_days_ago and p_to_days_ago.
create or replace function rookie_seed.complete_lessons(
  p_user uuid, p_course_slug text, p_count int, p_from_days_ago int, p_to_days_ago int
) returns void language sql as $$
  insert into public.student_progress (user_id, lesson_id, status, completed_at, last_viewed_at, created_at)
  select p_user, x.id, 'completed', x.at, x.at, x.at - interval '40 minutes'
  from (
    select l.id,
           rookie_seed.ago(
             p_from_days_ago - ((p_from_days_ago - p_to_days_ago) * (row_number() over (order by m.position, l.position) - 1)
                                / greatest(p_count - 1, 1))::int,
             8 + (abs(hashtext(p_user::text || l.id::text)::bigint) % 13)) as at
    from public.lessons l join public.course_modules m on m.id = l.module_id
    join public.courses c on c.id = l.course_id
    where c.slug = p_course_slug
    order by m.position, l.position
    limit p_count
  ) x
  on conflict do nothing
$$;

select rookie_seed.complete_lessons('11111111-0000-4000-8000-000000000011', 'java-fundamentals', 10, 62, 35);   -- Priya: Java done
select rookie_seed.complete_lessons('11111111-0000-4000-8000-000000000011', 'data-structures-algorithms', 6, 34, 3);
select rookie_seed.complete_lessons('11111111-0000-4000-8000-000000000011', 'object-oriented-programming', 4, 30, 6);
select rookie_seed.complete_lessons('11111111-0000-4000-8000-000000000011', 'dbms', 3, 20, 1);
select rookie_seed.complete_lessons('11111111-0000-4000-8000-000000000012', 'dbms', 6, 55, 10);                 -- Arjun
select rookie_seed.complete_lessons('11111111-0000-4000-8000-000000000012', 'computer-networks', 3, 40, 12);
select rookie_seed.complete_lessons('11111111-0000-4000-8000-000000000012', 'backend-development', 4, 25, 0);
select rookie_seed.complete_lessons('11111111-0000-4000-8000-000000000012', 'java-fundamentals', 2, 60, 58);
select rookie_seed.complete_lessons('11111111-0000-4000-8000-000000000013', 'frontend-development', 6, 50, 9);   -- Sofia: Frontend done
select rookie_seed.complete_lessons('11111111-0000-4000-8000-000000000013', 'computer-networks', 2, 20, 4);
select rookie_seed.complete_lessons('11111111-0000-4000-8000-000000000013', 'data-structures-algorithms', 2, 8, 1);
select rookie_seed.complete_lessons('11111111-0000-4000-8000-000000000014', 'operating-systems', 6, 46, 14);     -- Kenji: OS done
select rookie_seed.complete_lessons('11111111-0000-4000-8000-000000000014', 'computer-networks', 4, 30, 5);
select rookie_seed.complete_lessons('11111111-0000-4000-8000-000000000014', 'dbms', 5, 25, 2);
select rookie_seed.complete_lessons('11111111-0000-4000-8000-000000000014', 'data-structures-algorithms', 4, 12, 0);
select rookie_seed.complete_lessons('11111111-0000-4000-8000-000000000015', 'java-fundamentals', 4, 30, 6);      -- Amara
select rookie_seed.complete_lessons('11111111-0000-4000-8000-000000000015', 'data-structures-algorithms', 1, 4, 4);
select rookie_seed.complete_lessons('11111111-0000-4000-8000-000000000016', 'java-fundamentals', 8, 26, 8);      -- Liam
select rookie_seed.complete_lessons('11111111-0000-4000-8000-000000000016', 'object-oriented-programming', 3, 10, 3);
select rookie_seed.complete_lessons('11111111-0000-4000-8000-000000000016', 'data-structures-algorithms', 5, 9, 0);
select rookie_seed.complete_lessons('11111111-0000-4000-8000-000000000017', 'java-fundamentals', 3, 16, 10);     -- Zara
select rookie_seed.complete_lessons('11111111-0000-4000-8000-000000000017', 'dbms', 6, 14, 1);
select rookie_seed.complete_lessons('11111111-0000-4000-8000-000000000018', 'java-fundamentals', 2, 6, 2);       -- Diego

-- Manually ticked roadmap topics (topics without a lesson)
insert into public.roadmap_node_progress (user_id, node_id, completed_at)
select '11111111-0000-4000-8000-000000000011', n.id, now() - interval '12 days'
from public.roadmap_nodes n
where n.roadmap_id = '55555555-0000-4000-8000-000000000001' and n.title = 'Hash maps & sets';

-- ---------------------------------------------------------------------------
-- 11. Coding problems
-- Function-based: the runner calls `function_name(...input)` with the JSON
-- array in coding_problem_test_cases.input and deep-compares the result with
-- expected_output. Linked lists and trees are passed as arrays (trees in
-- level order with nulls).
-- ---------------------------------------------------------------------------
insert into public.coding_problems (id, slug, title, difficulty, topic, tags, description, input_format, output_format,
                                    constraints, examples, function_name, starter_code, solution_explanation, created_by, created_at) values
('77777777-0000-4000-8000-000000000001', 'two-sum', 'Two Sum', 'easy', 'Arrays', '{arrays,hash-map}',
 $md$Given an array of integers `nums` and an integer `target`, return the **indices** of the two numbers that add up to `target`.

Each input has **exactly one** solution, and you may not use the same element twice. Return the two indices in **increasing order**.$md$,
 'nums: integer array; target: integer', 'An array [i, j] with i < j',
 '{"2 <= nums.length <= 10^4","-10^9 <= nums[i] <= 10^9","-10^9 <= target <= 10^9","Exactly one valid answer exists"}',
 '[{"input":"nums = [2,7,11,15], target = 9","output":"[0,1]","explanation":"nums[0] + nums[1] = 2 + 7 = 9"},{"input":"nums = [3,2,4], target = 6","output":"[1,2]","explanation":"nums[1] + nums[2] = 2 + 4 = 6"}]',
 'twoSum',
 jsonb_build_object(
   'javascript', $c$function twoSum(nums, target) {
  // your code
}$c$,
   'python', $c$def two_sum(nums, target):
    # your code
    pass$c$,
   'java', $c$class Solution {
    public int[] twoSum(int[] nums, int target) {
        // your code
    }
}$c$),
 $md$## Approach: one-pass hash map

Walk the array once. For each `nums[i]`, the partner we need is `target - nums[i]`. Keep a map from **value → index** of everything seen so far; if the partner is already in the map, we found the answer.

```js
function twoSum(nums, target) {
  const seen = new Map();
  for (let i = 0; i < nums.length; i++) {
    const need = target - nums[i];
    if (seen.has(need)) return [seen.get(need), i];
    seen.set(nums[i], i);
  }
}
```

**Complexity:** O(n) time, O(n) space. The brute-force double loop is O(n²).$md$,
 '11111111-0000-4000-8000-000000000003', now() - interval '70 days'),

('77777777-0000-4000-8000-000000000002', 'best-time-to-buy-and-sell-stock', 'Best Time to Buy and Sell Stock', 'easy', 'Arrays', '{arrays,greedy}',
 $md$You are given an array `prices` where `prices[i]` is the price of a stock on day `i`.

Choose **one** day to buy and a **later** day to sell. Return the maximum profit you can achieve, or `0` if no profit is possible.$md$,
 'prices: integer array', 'An integer — the maximum profit',
 '{"1 <= prices.length <= 10^5","0 <= prices[i] <= 10^4"}',
 '[{"input":"prices = [7,1,5,3,6,4]","output":"5","explanation":"Buy on day 1 (price 1) and sell on day 4 (price 6): 6 - 1 = 5."},{"input":"prices = [7,6,4,3,1]","output":"0","explanation":"Prices only fall, so no transaction is made."}]',
 'maxProfit',
 jsonb_build_object(
   'javascript', $c$function maxProfit(prices) {
  // your code
}$c$,
   'python', $c$def max_profit(prices):
    # your code
    pass$c$,
   'java', $c$class Solution {
    public int maxProfit(int[] prices) {
        // your code
    }
}$c$),
 $md$## Approach: track the minimum so far

The best sale on day `i` buys at the lowest price **before** day `i`. Keep `minPrice` and update `best = max(best, price - minPrice)` as you scan.

```js
function maxProfit(prices) {
  let minPrice = Infinity, best = 0;
  for (const p of prices) {
    minPrice = Math.min(minPrice, p);
    best = Math.max(best, p - minPrice);
  }
  return best;
}
```

**Complexity:** O(n) time, O(1) space.$md$,
 '11111111-0000-4000-8000-000000000003', now() - interval '70 days'),

('77777777-0000-4000-8000-000000000003', 'maximum-subarray', 'Maximum Subarray', 'medium', 'Arrays', '{arrays,dynamic-programming,kadane}',
 $md$Given an integer array `nums`, find the **contiguous** subarray (containing at least one number) with the largest sum and return that sum.$md$,
 'nums: integer array', 'An integer — the largest subarray sum',
 '{"1 <= nums.length <= 10^5","-10^4 <= nums[i] <= 10^4"}',
 '[{"input":"nums = [-2,1,-3,4,-1,2,1,-5,4]","output":"6","explanation":"The subarray [4,-1,2,1] has the largest sum, 6."},{"input":"nums = [1]","output":"1","explanation":"A single element is the whole array."}]',
 'maxSubArray',
 jsonb_build_object(
   'javascript', $c$function maxSubArray(nums) {
  // your code
}$c$,
   'python', $c$def max_sub_array(nums):
    # your code
    pass$c$,
   'java', $c$class Solution {
    public int maxSubArray(int[] nums) {
        // your code
    }
}$c$),
 $md$## Approach: Kadane's algorithm

At each index the best subarray **ending here** either extends the previous one or starts fresh: `cur = max(x, cur + x)`. The answer is the maximum `cur` seen.

```js
function maxSubArray(nums) {
  let cur = nums[0], best = nums[0];
  for (let i = 1; i < nums.length; i++) {
    cur = Math.max(nums[i], cur + nums[i]);
    best = Math.max(best, cur);
  }
  return best;
}
```

Initialising with `nums[0]` (not `0`) handles all-negative arrays. **Complexity:** O(n) time, O(1) space.$md$,
 '11111111-0000-4000-8000-000000000003', now() - interval '69 days'),

('77777777-0000-4000-8000-000000000004', 'valid-palindrome', 'Valid Palindrome', 'easy', 'Strings', '{strings,two-pointers}',
 $md$A phrase is a **palindrome** if, after converting all uppercase letters to lowercase and removing every non-alphanumeric character, it reads the same forward and backward.

Given a string `s`, return `true` if it is a palindrome and `false` otherwise.$md$,
 's: string', 'true or false',
 '{"1 <= s.length <= 2 * 10^5","s consists of printable ASCII characters"}',
 '[{"input":"s = \"A man, a plan, a canal: Panama\"","output":"true","explanation":"\"amanaplanacanalpanama\" is a palindrome."},{"input":"s = \"race a car\"","output":"false","explanation":"\"raceacar\" is not a palindrome."}]',
 'isPalindrome',
 jsonb_build_object(
   'javascript', $c$function isPalindrome(s) {
  // your code
}$c$,
   'python', $c$def is_palindrome(s):
    # your code
    pass$c$,
   'java', $c$class Solution {
    public boolean isPalindrome(String s) {
        // your code
    }
}$c$),
 $md$## Approach: two pointers

Move `i` from the left and `j` from the right, skipping non-alphanumeric characters, and compare lowercase characters.

```js
function isPalindrome(s) {
  const ok = (c) => /[a-z0-9]/i.test(c);
  let i = 0, j = s.length - 1;
  while (i < j) {
    if (!ok(s[i])) { i++; continue; }
    if (!ok(s[j])) { j--; continue; }
    if (s[i].toLowerCase() !== s[j].toLowerCase()) return false;
    i++; j--;
  }
  return true;
}
```

**Complexity:** O(n) time, O(1) extra space.$md$,
 '11111111-0000-4000-8000-000000000003', now() - interval '69 days'),

('77777777-0000-4000-8000-000000000005', 'reverse-words-in-a-string', 'Reverse Words in a String', 'medium', 'Strings', '{strings}',
 $md$Given a string `s`, reverse the order of the **words**. A word is a sequence of non-space characters.

The result must have the words separated by a **single space**, with no leading or trailing spaces — even if `s` contains extra spaces.$md$,
 's: string', 'A string with the words in reverse order',
 '{"1 <= s.length <= 10^4","s contains English letters, digits and spaces","There is at least one word in s"}',
 '[{"input":"s = \"the sky is blue\"","output":"\"blue is sky the\"","explanation":"Words are reversed."},{"input":"s = \"  hello world  \"","output":"\"world hello\"","explanation":"Leading and trailing spaces are removed."}]',
 'reverseWords',
 jsonb_build_object(
   'javascript', $c$function reverseWords(s) {
  // your code
}$c$,
   'python', $c$def reverse_words(s):
    # your code
    pass$c$,
   'java', $c$class Solution {
    public String reverseWords(String s) {
        // your code
    }
}$c$),
 $md$## Approach: split, filter, reverse, join

Split on whitespace, drop empty strings created by repeated spaces, reverse and join with one space.

```js
function reverseWords(s) {
  return s.trim().split(/\s+/).reverse().join(' ');
}
```

**Follow-up:** in a language with mutable strings you can do it in place: reverse the whole string, then reverse each word. **Complexity:** O(n).$md$,
 '11111111-0000-4000-8000-000000000003', now() - interval '68 days'),

('77777777-0000-4000-8000-000000000006', 'valid-anagram', 'Valid Anagram', 'easy', 'Hashing', '{strings,hash-map,counting}',
 $md$Given two strings `s` and `t`, return `true` if `t` is an **anagram** of `s` — that is, it uses exactly the same letters the same number of times — and `false` otherwise.$md$,
 's, t: strings of lowercase English letters', 'true or false',
 '{"1 <= s.length, t.length <= 5 * 10^4","s and t consist of lowercase English letters"}',
 '[{"input":"s = \"anagram\", t = \"nagaram\"","output":"true","explanation":"Both contain a×3, n, g, r, m."},{"input":"s = \"rat\", t = \"car\"","output":"false","explanation":"t has a c and no t."}]',
 'isAnagram',
 jsonb_build_object(
   'javascript', $c$function isAnagram(s, t) {
  // your code
}$c$,
   'python', $c$def is_anagram(s, t):
    # your code
    pass$c$,
   'java', $c$class Solution {
    public boolean isAnagram(String s, String t) {
        // your code
    }
}$c$),
 $md$## Approach: count characters

If the lengths differ, return `false`. Otherwise increment a counter for each character of `s` and decrement for each character of `t`; all counters must end at zero.

```js
function isAnagram(s, t) {
  if (s.length !== t.length) return false;
  const count = new Array(26).fill(0);
  for (let i = 0; i < s.length; i++) {
    count[s.charCodeAt(i) - 97]++;
    count[t.charCodeAt(i) - 97]--;
  }
  return count.every((c) => c === 0);
}
```

**Complexity:** O(n) time, O(1) space (26 counters). Sorting both strings also works in O(n log n).$md$,
 '11111111-0000-4000-8000-000000000003', now() - interval '68 days'),

('77777777-0000-4000-8000-000000000007', 'first-unique-character', 'First Unique Character in a String', 'easy', 'Hashing', '{strings,hash-map,counting}',
 $md$Given a string `s`, return the **index** of the first character that appears exactly once. If there is no such character, return `-1`.$md$,
 's: string of lowercase English letters', 'An integer index, or -1',
 '{"1 <= s.length <= 10^5","s consists of lowercase English letters"}',
 '[{"input":"s = \"leetcode\"","output":"0","explanation":"\"l\" appears once and is first."},{"input":"s = \"loveleetcode\"","output":"2","explanation":"\"l\" and \"o\" repeat; \"v\" at index 2 is the first unique character."}]',
 'firstUniqChar',
 jsonb_build_object(
   'javascript', $c$function firstUniqChar(s) {
  // your code
}$c$,
   'python', $c$def first_uniq_char(s):
    # your code
    pass$c$,
   'java', $c$class Solution {
    public int firstUniqChar(String s) {
        // your code
    }
}$c$),
 $md$## Approach: two passes

First pass: count every character. Second pass: return the first index whose count is 1.

```js
function firstUniqChar(s) {
  const count = new Map();
  for (const c of s) count.set(c, (count.get(c) || 0) + 1);
  for (let i = 0; i < s.length; i++) if (count.get(s[i]) === 1) return i;
  return -1;
}
```

**Complexity:** O(n) time, O(1) space (at most 26 keys).$md$,
 '11111111-0000-4000-8000-000000000002', now() - interval '67 days'),

('77777777-0000-4000-8000-000000000008', 'reverse-linked-list', 'Reverse Linked List', 'easy', 'Linked Lists', '{linked-list,two-pointers}',
 $md$Given the `head` of a singly linked list, reverse the list and return it.

In this playground the list is given as an **array of node values in order** (e.g. `[1,2,3]` is `1 → 2 → 3`), and you return the reversed list as an array. Try to implement the pointer-reversal logic rather than calling a built-in `reverse`.$md$,
 'head: array of integers representing the list', 'Array of integers representing the reversed list',
 '{"0 <= number of nodes <= 5000","-5000 <= Node.val <= 5000"}',
 '[{"input":"head = [1,2,3,4,5]","output":"[5,4,3,2,1]","explanation":"1→2→3→4→5 becomes 5→4→3→2→1."},{"input":"head = [1,2]","output":"[2,1]","explanation":""}]',
 'reverseList',
 jsonb_build_object(
   'javascript', $c$function reverseList(head) {
  // head is an array of values, e.g. [1, 2, 3]
  // your code
}$c$,
   'python', $c$def reverse_list(head):
    # head is a list of values, e.g. [1, 2, 3]
    # your code
    pass$c$,
   'java', $c$class Solution {
    // head is given as an array of values, e.g. {1, 2, 3}
    public int[] reverseList(int[] head) {
        // your code
    }
}$c$),
 $md$## Approach: iterative pointer reversal

With real nodes, keep `prev = null` and `curr = head`; for each node save `next`, point `curr.next` at `prev`, then advance both.

```js
function reverseList(head) {
  // build nodes, reverse pointers, read back
  let list = null;
  for (let i = head.length - 1; i >= 0; i--) list = { val: head[i], next: list };
  let prev = null, curr = list;
  while (curr) {
    const next = curr.next;
    curr.next = prev;
    prev = curr;
    curr = next;
  }
  const out = [];
  for (let n = prev; n; n = n.next) out.push(n.val);
  return out;
}
```

**Complexity:** O(n) time, O(1) extra space for the reversal itself.$md$,
 '11111111-0000-4000-8000-000000000003', now() - interval '66 days'),

('77777777-0000-4000-8000-000000000009', 'merge-two-sorted-lists', 'Merge Two Sorted Lists', 'easy', 'Linked Lists', '{linked-list,two-pointers}',
 $md$You are given two **sorted** linked lists `list1` and `list2` (as arrays of values). Merge them into one sorted list and return it as an array.$md$,
 'list1, list2: sorted integer arrays', 'A sorted integer array containing all values',
 '{"0 <= length of each list <= 50","-100 <= Node.val <= 100","Both lists are sorted in non-decreasing order"}',
 '[{"input":"list1 = [1,2,4], list2 = [1,3,4]","output":"[1,1,2,3,4,4]","explanation":""},{"input":"list1 = [], list2 = []","output":"[]","explanation":"Merging two empty lists gives an empty list."}]',
 'mergeTwoLists',
 jsonb_build_object(
   'javascript', $c$function mergeTwoLists(list1, list2) {
  // your code
}$c$,
   'python', $c$def merge_two_lists(list1, list2):
    # your code
    pass$c$,
   'java', $c$class Solution {
    public int[] mergeTwoLists(int[] list1, int[] list2) {
        // your code
    }
}$c$),
 $md$## Approach: two pointers (+ dummy head)

Compare the current heads, append the smaller one and advance that pointer. When one list runs out, append the rest of the other.

```js
function mergeTwoLists(a, b) {
  const out = [];
  let i = 0, j = 0;
  while (i < a.length && j < b.length) out.push(a[i] <= b[j] ? a[i++] : b[j++]);
  return out.concat(a.slice(i), b.slice(j));
}
```

With real nodes, a dummy head node avoids special-casing the first append. **Complexity:** O(n + m).$md$,
 '11111111-0000-4000-8000-000000000003', now() - interval '66 days'),

('77777777-0000-4000-8000-000000000010', 'valid-parentheses', 'Valid Parentheses', 'easy', 'Stacks', '{stack,strings}',
 $md$Given a string `s` containing only the characters `(`, `)`, `{`, `}`, `[` and `]`, determine whether it is **valid**:

1. Every open bracket is closed by the same type of bracket.
2. Brackets are closed in the correct order.
3. Every close bracket has a matching open bracket.$md$,
 's: string of bracket characters', 'true or false',
 '{"1 <= s.length <= 10^4","s consists of ()[]{} only"}',
 '[{"input":"s = \"()[]{}\"","output":"true","explanation":""},{"input":"s = \"(]\"","output":"false","explanation":"\"(\" is closed by \"]\"."}]',
 'isValid',
 jsonb_build_object(
   'javascript', $c$function isValid(s) {
  // your code
}$c$,
   'python', $c$def is_valid(s):
    # your code
    pass$c$,
   'java', $c$class Solution {
    public boolean isValid(String s) {
        // your code
    }
}$c$),
 $md$## Approach: stack

Push the **expected closing bracket** for every opener. For a closer, the stack top must match it. At the end the stack must be empty.

```js
function isValid(s) {
  const pairs = { '(': ')', '[': ']', '{': '}' };
  const stack = [];
  for (const c of s) {
    if (pairs[c]) stack.push(pairs[c]);
    else if (stack.pop() !== c) return false;
  }
  return stack.length === 0;
}
```

**Complexity:** O(n) time and space.$md$,
 '11111111-0000-4000-8000-000000000002', now() - interval '65 days'),

('77777777-0000-4000-8000-000000000011', 'evaluate-reverse-polish-notation', 'Evaluate Reverse Polish Notation', 'medium', 'Stacks', '{stack,math}',
 $md$Evaluate an arithmetic expression given in **Reverse Polish Notation** as an array of tokens.

- Valid operators are `+`, `-`, `*` and `/`.
- Each operand is an integer or another expression.
- Division between two integers **truncates toward zero**.
- The input is always a valid RPN expression and no division by zero occurs.$md$,
 'tokens: array of strings', 'An integer — the value of the expression',
 '{"1 <= tokens.length <= 10^4","tokens[i] is an operator or an integer in [-200, 200]","Intermediate results fit in a 32-bit integer"}',
 '[{"input":"tokens = [\"2\",\"1\",\"+\",\"3\",\"*\"]","output":"9","explanation":"((2 + 1) * 3) = 9"},{"input":"tokens = [\"4\",\"13\",\"5\",\"/\",\"+\"]","output":"6","explanation":"(4 + (13 / 5)) = 4 + 2 = 6"}]',
 'evalRPN',
 jsonb_build_object(
   'javascript', $c$function evalRPN(tokens) {
  // your code
}$c$,
   'python', $c$def eval_rpn(tokens):
    # your code
    pass$c$,
   'java', $c$class Solution {
    public int evalRPN(String[] tokens) {
        // your code
    }
}$c$),
 $md$## Approach: stack of operands

Push numbers. On an operator, pop `b` then `a` (order matters for `-` and `/`), compute `a op b` and push the result.

```js
function evalRPN(tokens) {
  const st = [];
  for (const t of tokens) {
    if (['+', '-', '*', '/'].includes(t)) {
      const b = st.pop(), a = st.pop();
      st.push(t === '+' ? a + b : t === '-' ? a - b : t === '*' ? a * b : Math.trunc(a / b));
    } else st.push(Number(t));
  }
  return st.pop();
}
```

Use `Math.trunc` (not `Math.floor`) so `-7 / 2` gives `-3`. In Python use `int(a / b)`. **Complexity:** O(n).$md$,
 '11111111-0000-4000-8000-000000000003', now() - interval '64 days'),

('77777777-0000-4000-8000-000000000012', 'find-the-winner-of-the-circular-game', 'Find the Winner of the Circular Game', 'medium', 'Queues', '{queue,simulation,math,josephus}',
 $md$`n` friends numbered `1` to `n` sit in a circle. Starting from friend `1`, count `k` friends clockwise (including the one you start at); the last friend counted leaves the circle. Counting resumes from the friend immediately clockwise of the one who left. The last remaining friend wins.

Return the winner's number.$md$,
 'n: number of friends; k: count', 'An integer — the winning friend (1-indexed)',
 '{"1 <= k <= n <= 500"}',
 '[{"input":"n = 5, k = 2","output":"3","explanation":"Friends leave in the order 2, 4, 1, 5; friend 3 wins."},{"input":"n = 6, k = 5","output":"1","explanation":"Friends leave in the order 5, 4, 6, 2, 3; friend 1 wins."}]',
 'findTheWinner',
 jsonb_build_object(
   'javascript', $c$function findTheWinner(n, k) {
  // your code
}$c$,
   'python', $c$def find_the_winner(n, k):
    # your code
    pass$c$,
   'java', $c$class Solution {
    public int findTheWinner(int n, int k) {
        // your code
    }
}$c$),
 $md$## Approach 1: simulate with a queue

Put `1..n` in a queue. Repeat: move `k - 1` friends from the front to the back, then remove the front one. The last one left wins. O(n·k).

```js
function findTheWinner(n, k) {
  const q = Array.from({ length: n }, (_, i) => i + 1);
  while (q.length > 1) {
    for (let i = 0; i < k - 1; i++) q.push(q.shift());
    q.shift();
  }
  return q[0];
}
```

## Approach 2: Josephus recurrence

With 0-indexed positions, `J(1) = 0` and `J(m) = (J(m-1) + k) % m`. The answer is `J(n) + 1`. O(n) time, O(1) space.$md$,
 '11111111-0000-4000-8000-000000000003', now() - interval '63 days'),

('77777777-0000-4000-8000-000000000013', 'sliding-window-maximum', 'Sliding Window Maximum', 'hard', 'Queues', '{deque,sliding-window,monotonic-queue}',
 $md$You are given an integer array `nums` and a window size `k`. The window starts at the very left and moves right one position at a time.

Return an array with the **maximum** of each window.$md$,
 'nums: integer array; k: window size', 'Integer array of length nums.length - k + 1',
 '{"1 <= nums.length <= 10^5","-10^4 <= nums[i] <= 10^4","1 <= k <= nums.length"}',
 '[{"input":"nums = [1,3,-1,-3,5,3,6,7], k = 3","output":"[3,3,5,5,6,7]","explanation":"Windows: [1,3,-1]→3, [3,-1,-3]→3, [-1,-3,5]→5, [-3,5,3]→5, [5,3,6]→6, [3,6,7]→7."},{"input":"nums = [1], k = 1","output":"[1]","explanation":""}]',
 'maxSlidingWindow',
 jsonb_build_object(
   'javascript', $c$function maxSlidingWindow(nums, k) {
  // your code
}$c$,
   'python', $c$def max_sliding_window(nums, k):
    # your code
    pass$c$,
   'java', $c$class Solution {
    public int[] maxSlidingWindow(int[] nums, int k) {
        // your code
    }
}$c$),
 $md$## Approach: monotonic deque

Store **indexes** in a deque whose values are strictly decreasing from front to back.

1. Drop the front index if it has left the window (`<= i - k`).
2. Pop from the back while the back value is `<= nums[i]` — those can never be a maximum again.
3. Push `i`. Once `i >= k - 1`, the front is the window maximum.

```js
function maxSlidingWindow(nums, k) {
  const dq = [], out = [];
  let head = 0;
  for (let i = 0; i < nums.length; i++) {
    if (head < dq.length && dq[head] <= i - k) head++;
    while (dq.length > head && nums[dq[dq.length - 1]] <= nums[i]) dq.pop();
    dq.push(i);
    if (i >= k - 1) out.push(nums[dq[head]]);
  }
  return out;
}
```

Each index enters and leaves once → **O(n)** time, O(k) space.$md$,
 '11111111-0000-4000-8000-000000000003', now() - interval '62 days'),

('77777777-0000-4000-8000-000000000014', 'maximum-depth-of-binary-tree', 'Maximum Depth of Binary Tree', 'easy', 'Trees', '{tree,dfs,recursion}',
 $md$Given the `root` of a binary tree, return its **maximum depth** — the number of nodes along the longest path from the root down to the farthest leaf.

The tree is given in **level order** with `null` for missing children, e.g. `[3,9,20,null,null,15,7]`. An empty tree is `[]`.$md$,
 'root: level-order array with nulls', 'An integer — the depth',
 '{"0 <= number of nodes <= 10^4","-100 <= Node.val <= 100"}',
 '[{"input":"root = [3,9,20,null,null,15,7]","output":"3","explanation":"The longest paths are 3→20→15 and 3→20→7."},{"input":"root = [1,null,2]","output":"2","explanation":""}]',
 'maxDepth',
 jsonb_build_object(
   'javascript', $c$function maxDepth(root) {
  // root is a level-order array, e.g. [3, 9, 20, null, null, 15, 7]
  // your code
}$c$,
   'python', $c$def max_depth(root):
    # root is a level-order list, e.g. [3, 9, 20, None, None, 15, 7]
    # your code
    pass$c$,
   'java', $c$class Solution {
    // root is a level-order array, e.g. {3, 9, 20, null, null, 15, 7}
    public int maxDepth(Integer[] root) {
        // your code
    }
}$c$),
 $md$## Approach: build the tree, then recurse

First rebuild nodes from the level-order array (a queue of parents, assigning left/right children in order). Then:

```js
const depth = (node) => (node ? 1 + Math.max(depth(node.left), depth(node.right)) : 0);
```

```js
function maxDepth(root) {
  if (!root.length || root[0] === null) return 0;
  const nodes = { val: root[0], left: null, right: null };
  const q = [nodes];
  let i = 1;
  while (i < root.length) {
    const parent = q.shift();
    for (const side of ['left', 'right']) {
      if (i < root.length && root[i] !== null) {
        parent[side] = { val: root[i], left: null, right: null };
        q.push(parent[side]);
      }
      i++;
    }
  }
  const depth = (n) => (n ? 1 + Math.max(depth(n.left), depth(n.right)) : 0);
  return depth(nodes);
}
```

**Complexity:** O(n) time, O(h) recursion depth. A BFS that counts levels works too.$md$,
 '11111111-0000-4000-8000-000000000003', now() - interval '61 days'),

('77777777-0000-4000-8000-000000000015', 'binary-tree-level-order-traversal', 'Binary Tree Level Order Traversal', 'medium', 'Trees', '{tree,bfs,queue}',
 $md$Given the `root` of a binary tree (as a level-order array with `null`s), return the values level by level, from left to right — an array of arrays, one per level.$md$,
 'root: level-order array with nulls', 'Array of arrays of integers',
 '{"0 <= number of nodes <= 2000","-1000 <= Node.val <= 1000"}',
 '[{"input":"root = [3,9,20,null,null,15,7]","output":"[[3],[9,20],[15,7]]","explanation":""},{"input":"root = [1]","output":"[[1]]","explanation":""}]',
 'levelOrder',
 jsonb_build_object(
   'javascript', $c$function levelOrder(root) {
  // root is a level-order array, e.g. [3, 9, 20, null, null, 15, 7]
  // your code
}$c$,
   'python', $c$def level_order(root):
    # root is a level-order list, e.g. [3, 9, 20, None, None, 15, 7]
    # your code
    pass$c$,
   'java', $c$import java.util.*;

class Solution {
    public List<List<Integer>> levelOrder(Integer[] root) {
        // your code
    }
}$c$),
 $md$## Approach: BFS one level at a time

After building the tree, push the root into a queue. While the queue is not empty, record its current size `n`, pop exactly `n` nodes (that is one level), collect their values and push their children.

```js
const result = [];
let queue = [rootNode];
while (queue.length) {
  result.push(queue.map((n) => n.val));
  queue = queue.flatMap((n) => [n.left, n.right].filter(Boolean));
}
```

**Complexity:** O(n) time, O(width) space. Remember to return `[]` for an empty tree.$md$,
 '11111111-0000-4000-8000-000000000003', now() - interval '60 days'),

('77777777-0000-4000-8000-000000000016', 'merge-intervals', 'Merge Intervals', 'medium', 'Sorting', '{sorting,intervals}',
 $md$Given an array of `intervals` where `intervals[i] = [start, end]`, merge all **overlapping** intervals and return the non-overlapping intervals that cover all the input, **sorted by start**.

Intervals that touch (e.g. `[1,4]` and `[4,5]`) count as overlapping.$md$,
 'intervals: array of [start, end] pairs', 'Array of merged [start, end] pairs sorted by start',
 '{"1 <= intervals.length <= 10^4","0 <= start <= end <= 10^4"}',
 '[{"input":"intervals = [[1,3],[2,6],[8,10],[15,18]]","output":"[[1,6],[8,10],[15,18]]","explanation":"[1,3] and [2,6] overlap, so they merge into [1,6]."},{"input":"intervals = [[1,4],[4,5]]","output":"[[1,5]]","explanation":"Touching intervals are merged."}]',
 'mergeIntervals',
 jsonb_build_object(
   'javascript', $c$function mergeIntervals(intervals) {
  // your code
}$c$,
   'python', $c$def merge_intervals(intervals):
    # your code
    pass$c$,
   'java', $c$class Solution {
    public int[][] mergeIntervals(int[][] intervals) {
        // your code
    }
}$c$),
 $md$## Approach: sort, then sweep

Sort by start. Keep the last merged interval; if the next one starts at or before its end, extend the end, otherwise start a new interval.

```js
function mergeIntervals(intervals) {
  const sorted = [...intervals].sort((a, b) => a[0] - b[0]);
  const out = [];
  for (const [s, e] of sorted) {
    const last = out[out.length - 1];
    if (last && s <= last[1]) last[1] = Math.max(last[1], e);
    else out.push([s, e]);
  }
  return out;
}
```

Don't forget `Math.max` — an interval can be fully contained in the previous one. **Complexity:** O(n log n).$md$,
 '11111111-0000-4000-8000-000000000003', now() - interval '59 days'),

('77777777-0000-4000-8000-000000000017', 'binary-search', 'Binary Search', 'easy', 'Searching', '{binary-search,arrays}',
 $md$Given a **sorted** (ascending) array of distinct integers `nums` and a `target`, return the index of `target`, or `-1` if it is not present.

Your algorithm must run in **O(log n)** time.$md$,
 'nums: sorted integer array; target: integer', 'An integer index, or -1',
 '{"1 <= nums.length <= 10^4","All values in nums are distinct","nums is sorted in ascending order"}',
 '[{"input":"nums = [-1,0,3,5,9,12], target = 9","output":"4","explanation":"9 is at index 4."},{"input":"nums = [-1,0,3,5,9,12], target = 2","output":"-1","explanation":"2 is not in nums."}]',
 'binarySearch',
 jsonb_build_object(
   'javascript', $c$function binarySearch(nums, target) {
  // your code
}$c$,
   'python', $c$def binary_search(nums, target):
    # your code
    pass$c$,
   'java', $c$class Solution {
    public int binarySearch(int[] nums, int target) {
        // your code
    }
}$c$),
 $md$## Approach: halve the search range

```js
function binarySearch(nums, target) {
  let lo = 0, hi = nums.length - 1;
  while (lo <= hi) {
    const mid = lo + ((hi - lo) >> 1);
    if (nums[mid] === target) return mid;
    if (nums[mid] < target) lo = mid + 1;
    else hi = mid - 1;
  }
  return -1;
}
```

Watch the loop condition (`<=`) and the `± 1` updates. **Complexity:** O(log n) time, O(1) space.$md$,
 '11111111-0000-4000-8000-000000000002', now() - interval '58 days'),

('77777777-0000-4000-8000-000000000018', 'find-first-and-last-position', 'Find First and Last Position of Element', 'medium', 'Searching', '{binary-search,arrays}',
 $md$Given an array `nums` sorted in non-decreasing order, find the **starting and ending** position of a given `target`. If `target` is not found, return `[-1, -1]`.

Your algorithm must run in **O(log n)** time.$md$,
 'nums: sorted integer array; target: integer', 'An array [first, last]',
 '{"0 <= nums.length <= 10^5","-10^9 <= nums[i], target <= 10^9","nums is sorted in non-decreasing order"}',
 '[{"input":"nums = [5,7,7,8,8,10], target = 8","output":"[3,4]","explanation":""},{"input":"nums = [5,7,7,8,8,10], target = 6","output":"[-1,-1]","explanation":"6 does not occur."}]',
 'searchRange',
 jsonb_build_object(
   'javascript', $c$function searchRange(nums, target) {
  // your code
}$c$,
   'python', $c$def search_range(nums, target):
    # your code
    pass$c$,
   'java', $c$class Solution {
    public int[] searchRange(int[] nums, int target) {
        // your code
    }
}$c$),
 $md$## Approach: two lower-bound searches

`lowerBound(x)` returns the first index with `nums[i] >= x`. Then `first = lowerBound(target)` and `last = lowerBound(target + 1) - 1`; if `first` is out of range or `nums[first] !== target`, return `[-1, -1]`.

```js
function searchRange(nums, target) {
  const lowerBound = (x) => {
    let lo = 0, hi = nums.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (nums[mid] < x) lo = mid + 1; else hi = mid;
    }
    return lo;
  };
  const first = lowerBound(target);
  if (first === nums.length || nums[first] !== target) return [-1, -1];
  return [first, lowerBound(target + 1) - 1];
}
```

**Complexity:** O(log n).$md$,
 '11111111-0000-4000-8000-000000000003', now() - interval '57 days'),

('77777777-0000-4000-8000-000000000019', 'fizz-buzz', 'Fizz Buzz', 'easy', 'Math', '{math,strings,simulation}',
 $md$Given an integer `n`, return a string array `answer` (1-indexed) where:

- `answer[i] == "FizzBuzz"` if `i` is divisible by 3 and 5,
- `answer[i] == "Fizz"` if `i` is divisible by 3,
- `answer[i] == "Buzz"` if `i` is divisible by 5,
- `answer[i] == i` (as a string) otherwise.$md$,
 'n: integer', 'Array of n strings',
 '{"1 <= n <= 10^4"}',
 '[{"input":"n = 3","output":"[\"1\",\"2\",\"Fizz\"]","explanation":""},{"input":"n = 5","output":"[\"1\",\"2\",\"Fizz\",\"4\",\"Buzz\"]","explanation":""}]',
 'fizzBuzz',
 jsonb_build_object(
   'javascript', $c$function fizzBuzz(n) {
  // your code
}$c$,
   'python', $c$def fizz_buzz(n):
    # your code
    pass$c$,
   'java', $c$import java.util.*;

class Solution {
    public List<String> fizzBuzz(int n) {
        // your code
    }
}$c$),
 $md$## Approach: check 15 first

```js
function fizzBuzz(n) {
  const out = [];
  for (let i = 1; i <= n; i++) {
    if (i % 15 === 0) out.push('FizzBuzz');
    else if (i % 3 === 0) out.push('Fizz');
    else if (i % 5 === 0) out.push('Buzz');
    else out.push(String(i));
  }
  return out;
}
```

The order of checks matters: test divisibility by 15 (both) before 3 and 5. **Complexity:** O(n).$md$,
 '11111111-0000-4000-8000-000000000002', now() - interval '56 days'),

('77777777-0000-4000-8000-000000000020', 'count-primes', 'Count Primes', 'medium', 'Math', '{math,sieve}',
 $md$Given an integer `n`, return the number of **prime numbers strictly less than** `n`.$md$,
 'n: integer', 'An integer — the count of primes < n',
 '{"0 <= n <= 5 * 10^6"}',
 '[{"input":"n = 10","output":"4","explanation":"The primes below 10 are 2, 3, 5 and 7."},{"input":"n = 0","output":"0","explanation":""}]',
 'countPrimes',
 jsonb_build_object(
   'javascript', $c$function countPrimes(n) {
  // your code
}$c$,
   'python', $c$def count_primes(n):
    # your code
    pass$c$,
   'java', $c$class Solution {
    public int countPrimes(int n) {
        // your code
    }
}$c$),
 $md$## Approach: Sieve of Eratosthenes

Mark every number as prime, then for each prime `p` starting at 2 (while `p * p < n`) mark its multiples from `p * p` as composite.

```js
function countPrimes(n) {
  if (n < 3) return 0;
  const composite = new Uint8Array(n);
  let count = 0;
  for (let p = 2; p < n; p++) {
    if (composite[p]) continue;
    count++;
    for (let m = p * p; m < n; m += p) composite[m] = 1;
  }
  return count;
}
```

**Complexity:** O(n log log n) time, O(n) space. Trial division per number would be O(n√n).$md$,
 '11111111-0000-4000-8000-000000000002', now() - interval '55 days');

-- Test cases: input = JSON array of arguments. Two samples + hidden cases each.
insert into public.coding_problem_test_cases (problem_id, input, expected_output, is_sample, position)
select p.id, t.input::jsonb, t.expected::jsonb, t.sample, t.pos
from (values
  ('two-sum', '[[2,7,11,15],9]', '[0,1]', true, 1),
  ('two-sum', '[[3,2,4],6]', '[1,2]', true, 2),
  ('two-sum', '[[3,3],6]', '[0,1]', false, 3),
  ('two-sum', '[[-1,-2,-3,-4,-5],-8]', '[2,4]', false, 4),
  ('two-sum', '[[0,4,3,0],0]', '[0,3]', false, 5),
  ('best-time-to-buy-and-sell-stock', '[[7,1,5,3,6,4]]', '5', true, 1),
  ('best-time-to-buy-and-sell-stock', '[[7,6,4,3,1]]', '0', true, 2),
  ('best-time-to-buy-and-sell-stock', '[[1,2]]', '1', false, 3),
  ('best-time-to-buy-and-sell-stock', '[[2,4,1]]', '2', false, 4),
  ('best-time-to-buy-and-sell-stock', '[[3,3,5,0,0,3,1,4]]', '4', false, 5),
  ('maximum-subarray', '[[-2,1,-3,4,-1,2,1,-5,4]]', '6', true, 1),
  ('maximum-subarray', '[[1]]', '1', true, 2),
  ('maximum-subarray', '[[5,4,-1,7,8]]', '23', false, 3),
  ('maximum-subarray', '[[-3,-1,-2]]', '-1', false, 4),
  ('valid-palindrome', '["A man, a plan, a canal: Panama"]', 'true', true, 1),
  ('valid-palindrome', '["race a car"]', 'false', true, 2),
  ('valid-palindrome', '[" "]', 'true', false, 3),
  ('valid-palindrome', '["0P"]', 'false', false, 4),
  ('valid-palindrome', '["Was it a car or a cat I saw?"]', 'true', false, 5),
  ('reverse-words-in-a-string', '["the sky is blue"]', '"blue is sky the"', true, 1),
  ('reverse-words-in-a-string', '["  hello world  "]', '"world hello"', true, 2),
  ('reverse-words-in-a-string', '["a good   example"]', '"example good a"', false, 3),
  ('reverse-words-in-a-string', '["Rookie"]', '"Rookie"', false, 4),
  ('valid-anagram', '["anagram","nagaram"]', 'true', true, 1),
  ('valid-anagram', '["rat","car"]', 'false', true, 2),
  ('valid-anagram', '["a","ab"]', 'false', false, 3),
  ('valid-anagram', '["listen","silent"]', 'true', false, 4),
  ('first-unique-character', '["leetcode"]', '0', true, 1),
  ('first-unique-character', '["loveleetcode"]', '2', true, 2),
  ('first-unique-character', '["aabb"]', '-1', false, 3),
  ('first-unique-character', '["z"]', '0', false, 4),
  ('first-unique-character', '["aabbcdc"]', '5', false, 5),
  ('reverse-linked-list', '[[1,2,3,4,5]]', '[5,4,3,2,1]', true, 1),
  ('reverse-linked-list', '[[1,2]]', '[2,1]', true, 2),
  ('reverse-linked-list', '[[]]', '[]', false, 3),
  ('reverse-linked-list', '[[7]]', '[7]', false, 4),
  ('merge-two-sorted-lists', '[[1,2,4],[1,3,4]]', '[1,1,2,3,4,4]', true, 1),
  ('merge-two-sorted-lists', '[[],[]]', '[]', true, 2),
  ('merge-two-sorted-lists', '[[],[0]]', '[0]', false, 3),
  ('merge-two-sorted-lists', '[[-5,3,9],[-2,3,10,11]]', '[-5,-2,3,3,9,10,11]', false, 4),
  ('valid-parentheses', '["()[]{}"]', 'true', true, 1),
  ('valid-parentheses', '["(]"]', 'false', true, 2),
  ('valid-parentheses', '["([)]"]', 'false', false, 3),
  ('valid-parentheses', '["{[]}"]', 'true', false, 4),
  ('valid-parentheses', '["(("]', 'false', false, 5),
  ('evaluate-reverse-polish-notation', '[["2","1","+","3","*"]]', '9', true, 1),
  ('evaluate-reverse-polish-notation', '[["4","13","5","/","+"]]', '6', true, 2),
  ('evaluate-reverse-polish-notation', '[["10","6","9","3","+","-11","*","/","*","17","+","5","+"]]', '22', false, 3),
  ('evaluate-reverse-polish-notation', '[["7","-2","/"]]', '-3', false, 4),
  ('find-the-winner-of-the-circular-game', '[5,2]', '3', true, 1),
  ('find-the-winner-of-the-circular-game', '[6,5]', '1', true, 2),
  ('find-the-winner-of-the-circular-game', '[1,1]', '1', false, 3),
  ('find-the-winner-of-the-circular-game', '[7,3]', '4', false, 4),
  ('sliding-window-maximum', '[[1,3,-1,-3,5,3,6,7],3]', '[3,3,5,5,6,7]', true, 1),
  ('sliding-window-maximum', '[[1],1]', '[1]', true, 2),
  ('sliding-window-maximum', '[[9,8,7,6],2]', '[9,8,7]', false, 3),
  ('sliding-window-maximum', '[[1,-1],1]', '[1,-1]', false, 4),
  ('sliding-window-maximum', '[[4,2,12,3,8,1,7],4]', '[12,12,12,8]', false, 5),
  ('maximum-depth-of-binary-tree', '[[3,9,20,null,null,15,7]]', '3', true, 1),
  ('maximum-depth-of-binary-tree', '[[1,null,2]]', '2', true, 2),
  ('maximum-depth-of-binary-tree', '[[]]', '0', false, 3),
  ('maximum-depth-of-binary-tree', '[[1,2,3,4,null,null,5,6]]', '4', false, 4),
  ('binary-tree-level-order-traversal', '[[3,9,20,null,null,15,7]]', '[[3],[9,20],[15,7]]', true, 1),
  ('binary-tree-level-order-traversal', '[[1]]', '[[1]]', true, 2),
  ('binary-tree-level-order-traversal', '[[]]', '[]', false, 3),
  ('binary-tree-level-order-traversal', '[[1,2,3,4,null,null,5]]', '[[1],[2,3],[4,5]]', false, 4),
  ('merge-intervals', '[[[1,3],[2,6],[8,10],[15,18]]]', '[[1,6],[8,10],[15,18]]', true, 1),
  ('merge-intervals', '[[[1,4],[4,5]]]', '[[1,5]]', true, 2),
  ('merge-intervals', '[[[1,4],[0,4]]]', '[[0,4]]', false, 3),
  ('merge-intervals', '[[[2,3],[4,5],[6,7],[8,9],[1,10]]]', '[[1,10]]', false, 4),
  ('merge-intervals', '[[[1,4],[2,3]]]', '[[1,4]]', false, 5),
  ('binary-search', '[[-1,0,3,5,9,12],9]', '4', true, 1),
  ('binary-search', '[[-1,0,3,5,9,12],2]', '-1', true, 2),
  ('binary-search', '[[5],5]', '0', false, 3),
  ('binary-search', '[[1,3],3]', '1', false, 4),
  ('binary-search', '[[2,4,6,8,10],1]', '-1', false, 5),
  ('find-first-and-last-position', '[[5,7,7,8,8,10],8]', '[3,4]', true, 1),
  ('find-first-and-last-position', '[[5,7,7,8,8,10],6]', '[-1,-1]', true, 2),
  ('find-first-and-last-position', '[[],0]', '[-1,-1]', false, 3),
  ('find-first-and-last-position', '[[2,2,2,2],2]', '[0,3]', false, 4),
  ('find-first-and-last-position', '[[1],1]', '[0,0]', false, 5),
  ('fizz-buzz', '[3]', '["1","2","Fizz"]', true, 1),
  ('fizz-buzz', '[5]', '["1","2","Fizz","4","Buzz"]', true, 2),
  ('fizz-buzz', '[15]', '["1","2","Fizz","4","Buzz","Fizz","7","8","Fizz","Buzz","11","Fizz","13","14","FizzBuzz"]', false, 3),
  ('fizz-buzz', '[1]', '["1"]', false, 4),
  ('count-primes', '[10]', '4', true, 1),
  ('count-primes', '[0]', '0', true, 2),
  ('count-primes', '[2]', '0', false, 3),
  ('count-primes', '[100]', '25', false, 4),
  ('count-primes', '[5000]', '669', false, 5)
) as t(slug, input, expected, sample, pos)
join public.coding_problems p on p.slug = t.slug;

-- ---------------------------------------------------------------------------
-- 12. Coding submissions (accepted → problem_solved via trigger)
-- Vaiju's accepted solves fall inside the 7-day streak window (days 0–6).
-- ---------------------------------------------------------------------------
insert into public.coding_submissions (user_id, problem_id, language, code, verdict, passed_count, total_count, runtime_ms, created_at)
select '11111111-0000-4000-8000-000000000010', p.id, s.lang::public.code_language,
       '// solution submitted from the Rookie workspace', s.verdict::public.code_verdict,
       s.passed, s.total, s.ms, rookie_seed.ago(s.days_ago, s.hours)
from (values
  ('two-sum',                          'javascript', 'wrong_answer', 1, 2, 4,  6, 20.0),
  ('two-sum',                          'javascript', 'accepted',     2, 2, 3,  6, 20.5),
  ('fizz-buzz',                        'javascript', 'accepted',     2, 2, 1,  5, 21.5),
  ('valid-palindrome',                 'javascript', 'accepted',     2, 2, 2,  4, 21.0),
  ('binary-search',                    'java',       'accepted',     2, 2, 5,  3, 20.0),
  ('best-time-to-buy-and-sell-stock',  'javascript', 'wrong_answer', 1, 2, 2,  2, 21.0),
  ('best-time-to-buy-and-sell-stock',  'javascript', 'accepted',     2, 2, 2,  2, 21.3),
  ('valid-anagram',                    'python',     'accepted',     2, 2, 9,  1, 20.5),
  ('reverse-words-in-a-string',        'javascript', 'accepted',     2, 2, 3,  1, 21.0),
  ('valid-parentheses',                'javascript', 'runtime_error',0, 2, null, 0, 0.5),
  ('valid-parentheses',                'javascript', 'accepted',     2, 2, 2,  0, 0.6),
  ('maximum-subarray',                 'javascript', 'wrong_answer', 1, 2, 3,  0, 0.7)
) as s(slug, lang, verdict, passed, total, ms, days_ago, hours)
join public.coding_problems p on p.slug = s.slug;

-- Other students: a handful of solves each
insert into public.coding_submissions (user_id, problem_id, language, code, verdict, passed_count, total_count, runtime_ms, created_at)
select u.id, p.id, 'javascript', '// solution', 'accepted', 2, 2, 3,
       rookie_seed.ago(((abs(hashtext(u.id::text || p.slug)) % 25) + 1)::int, 15)
from (values ('11111111-0000-4000-8000-000000000011'::uuid, 9),
             ('11111111-0000-4000-8000-000000000012'::uuid, 5),
             ('11111111-0000-4000-8000-000000000014'::uuid, 12),
             ('11111111-0000-4000-8000-000000000016'::uuid, 14),
             ('11111111-0000-4000-8000-000000000015'::uuid, 2),
             ('11111111-0000-4000-8000-000000000017'::uuid, 3)) as u(id, n)
cross join lateral (
  select id, slug from public.coding_problems where id::text like '77777777-%' order by id limit u.n
) p;

-- ---------------------------------------------------------------------------
-- 13. Assignments (+ notifications via trigger) and submissions
-- ---------------------------------------------------------------------------
insert into public.assignments (id, course_id, lesson_id, title, description, due_at, points, submission_type, created_by, created_at)
select a.id::uuid, c.id, l.id, a.title, a.descr, a.due, a.points, a.kind::public.submission_type, c.instructor_id, a.due - interval '7 days'
from (values
  ('99999999-0000-4000-8000-000000000001', 'java-fundamentals', 'variables', 'Temperature converter',
   E'Write a Java program that converts Celsius to Fahrenheit and Kelvin.\n\n- Read the value from a variable\n- Print all three values with 2 decimals\n- Use `final` for constants', now() - interval '20 days', 50, 'code'),
  ('99999999-0000-4000-8000-000000000002', 'java-fundamentals', 'conditions', 'Grade calculator',
   E'Given a score from 0–100, print the letter grade (A–F). Handle invalid input.\n\nSubmit your code.', now() - interval '6 days', 50, 'code'),
  ('99999999-0000-4000-8000-000000000003', 'data-structures-algorithms', 'arrays', 'Array rotation write-up',
   E'Explain **three** ways to rotate an array by k positions and compare their time and space complexity.', now() - interval '3 days', 100, 'text'),
  ('99999999-0000-4000-8000-000000000004', 'dbms', 'sql-basics', 'SQL basics worksheet',
   E'Write queries for the 10 questions in the worksheet using the sample schema. Share a link to your SQL file (GitHub gist is fine).', now() - interval '2 days', 100, 'url'),
  ('99999999-0000-4000-8000-000000000005', 'java-fundamentals', 'loops', 'Pattern printing with loops',
   E'Print the following patterns using nested loops:\n\n```\n*\n**\n***\n```\n\nand a number pyramid of height n.', date_trunc('day', now()) + interval '18 hours', 50, 'code'),
  ('99999999-0000-4000-8000-000000000006', 'data-structures-algorithms', 'linked-lists', 'Implement a singly linked list',
   E'Implement `add`, `remove`, `reverse` and `toString` for a singly linked list. Include tests.', now() + interval '1 day 4 hours', 100, 'url'),
  ('99999999-0000-4000-8000-000000000007', 'dbms', 'sql-joins', 'Joins in practice',
   E'Answer the join questions and explain when you would use a LEFT JOIN vs an anti-join.', now() + interval '4 days', 100, 'text'),
  ('99999999-0000-4000-8000-000000000008', 'object-oriented-programming', null, 'Model a library system',
   E'Design classes for a small library: books, members, loans. Submit a repo link with a README describing your design.', now() + interval '9 days', 150, 'url')
) as a(id, course_slug, lesson_slug, title, descr, due, points, kind)
join public.courses c on c.slug = a.course_slug
left join public.lessons l on l.course_id = c.id and l.slug = a.lesson_slug;

-- Vaiju's submissions (assignment 2 is deliberately missing → shows as Late)
insert into public.assignment_submissions (assignment_id, user_id, content, url, status, submitted_at, grade, feedback, reviewed_by, reviewed_at, created_at)
values
  ('99999999-0000-4000-8000-000000000001', '11111111-0000-4000-8000-000000000010',
   E'public class Temp {\n  static final double OFFSET = 273.15;\n  public static void main(String[] a) {\n    double c = 36.6;\n    System.out.printf("%.2f C = %.2f F = %.2f K%n", c, c * 9 / 5 + 32, c + OFFSET);\n  }\n}',
   null, 'reviewed', now() - interval '21 days', 46,
   'Clean and correct. Nice use of `final`. Consider extracting the conversions into methods.',
   '11111111-0000-4000-8000-000000000002', now() - interval '18 days', now() - interval '22 days'),
  ('99999999-0000-4000-8000-000000000003', '11111111-0000-4000-8000-000000000010',
   E'1. **Brute force** — shift by one k times: O(n·k) time, O(1) space.\n2. **Extra array** — place each element at (i+k) % n: O(n) time, O(n) space.\n3. **Reversal** — reverse all, reverse first k, reverse the rest: O(n) time, O(1) space.',
   null, 'submitted', rookie_seed.ago(3, 20), null, null, null, null, rookie_seed.ago(4, 19)),
  ('99999999-0000-4000-8000-000000000004', '11111111-0000-4000-8000-000000000010',
   '', 'https://gist.github.com/example/sql-basics', 'reviewed', rookie_seed.ago(4, 18), 88,
   'Good work. Q7 needs a GROUP BY on both columns — re-check it.',
   '11111111-0000-4000-8000-000000000003', now() - interval '1 day', rookie_seed.ago(5, 18)),
  ('99999999-0000-4000-8000-000000000005', '11111111-0000-4000-8000-000000000010',
   E'for (int i = 1; i <= n; i++) {\n  System.out.println("*".repeat(i));\n}', null, 'in_progress', null, null, null, null, null, now() - interval '3 hours');

-- Classmates' submissions for instructor review queues
insert into public.assignment_submissions (assignment_id, user_id, content, status, submitted_at, created_at)
select a.id, e.user_id, 'See attached solution.', 'submitted', a.due_at - interval '1 day', a.due_at - interval '2 days'
from public.assignments a
join public.course_enrollments e on e.course_id = a.course_id
where a.id::text like '99999999-%' and a.due_at < now()
  and e.user_id <> '11111111-0000-4000-8000-000000000010'
  and abs(hashtext(e.user_id::text || a.id::text)) % 4 <> 0
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- 14. Daily agendas
-- ---------------------------------------------------------------------------
insert into public.daily_agendas (id, owner_id, course_id, date, title, created_by) values
  ('bbbbbbbb-0000-4000-8000-000000000001', '11111111-0000-4000-8000-000000000010', null, current_date,     'Today',     '11111111-0000-4000-8000-000000000010'),
  ('bbbbbbbb-0000-4000-8000-000000000002', '11111111-0000-4000-8000-000000000010', null, current_date - 1, 'Yesterday', '11111111-0000-4000-8000-000000000010'),
  ('bbbbbbbb-0000-4000-8000-000000000003', '11111111-0000-4000-8000-000000000010', null, current_date + 1, 'Tomorrow',  '11111111-0000-4000-8000-000000000010'),
  ('bbbbbbbb-0000-4000-8000-000000000004', null, '22222222-0000-4000-8000-000000000001', current_date, 'Java cohort plan', '11111111-0000-4000-8000-000000000002');

insert into public.agenda_items (id, agenda_id, title, description, type, start_time, end_time, priority, course_id, lesson_id, class_id, assignment_id, problem_id)
select i.id::uuid, i.agenda::uuid, i.title, i.descr, i.type::public.agenda_item_type, i.st::time, i.et::time,
       i.prio::public.priority, c.id, l.id, i.class_id::uuid, i.assignment_id::uuid, p.id
from (values
  ('cccccccc-0000-4000-8000-000000000001', 'bbbbbbbb-0000-4000-8000-000000000001', 'Review Java variables', 'Skim your notes and redo the variables exercise.', 'revision', '08:30', '09:00', 'low', 'java-fundamentals', 'variables', null, null, null),
  ('cccccccc-0000-4000-8000-000000000002', 'bbbbbbbb-0000-4000-8000-000000000001', 'Solve 3 array problems', 'Two Sum, Best Time to Buy and Sell Stock, Maximum Subarray.', 'problem', '11:30', '12:30', 'high', 'data-structures-algorithms', null, null, null, 'maximum-subarray'),
  ('cccccccc-0000-4000-8000-000000000003', 'bbbbbbbb-0000-4000-8000-000000000001', 'DBMS — SQL Joins', 'Read the lesson and run every query yourself.', 'study', '14:00', '15:00', 'medium', 'dbms', 'sql-joins', null, null, null),
  ('cccccccc-0000-4000-8000-000000000004', 'bbbbbbbb-0000-4000-8000-000000000001', 'Finish pattern printing assignment', 'Due tonight.', 'assignment', '16:00', '17:00', 'high', 'java-fundamentals', 'loops', null, '99999999-0000-4000-8000-000000000005', null),
  ('cccccccc-0000-4000-8000-000000000005', 'bbbbbbbb-0000-4000-8000-000000000001', 'Revision', 'Flashcards: complexity of array operations.', 'revision', '18:00', '18:30', 'low', null, null, null, null, null),
  ('cccccccc-0000-4000-8000-000000000006', 'bbbbbbbb-0000-4000-8000-000000000002', 'Strings lesson', 'Two pointers and StringBuilder.', 'study', '19:00', '20:00', 'medium', 'data-structures-algorithms', 'strings', null, null, null),
  ('cccccccc-0000-4000-8000-000000000007', 'bbbbbbbb-0000-4000-8000-000000000002', 'Valid Anagram in Python', 'Try a language other than JS.', 'problem', '20:30', '21:00', 'medium', 'data-structures-algorithms', null, null, null, 'valid-anagram'),
  ('cccccccc-0000-4000-8000-000000000008', 'bbbbbbbb-0000-4000-8000-000000000003', 'Linked list assignment', 'Implement add/remove/reverse.', 'assignment', '09:00', '11:00', 'high', 'data-structures-algorithms', 'linked-lists', null, '99999999-0000-4000-8000-000000000006', null),
  ('cccccccc-0000-4000-8000-000000000009', 'bbbbbbbb-0000-4000-8000-000000000003', 'Arrays lesson (Java)', 'Finish the arrays lesson.', 'study', '15:00', '16:00', 'medium', 'java-fundamentals', 'arrays', null, null, null),
  ('cccccccc-0000-4000-8000-000000000010', 'bbbbbbbb-0000-4000-8000-000000000004', 'Warm-up: trace three loops on paper', 'Before class, predict the output of the three snippets in the Loops lesson.', 'task', '09:30', '10:00', 'medium', 'java-fundamentals', 'loops', null, null, null),
  ('cccccccc-0000-4000-8000-000000000011', 'bbbbbbbb-0000-4000-8000-000000000004', 'Post one question in the cohort chat', 'Anything about loops or arrays you are unsure of.', 'task', '17:30', '17:45', 'low', 'java-fundamentals', null, null, null, null)
) as i(id, agenda, title, descr, type, st, et, prio, course_slug, lesson_slug, class_id, assignment_id, problem_slug)
left join public.courses c on c.slug = i.course_slug
left join public.lessons l on l.course_id = c.id and l.slug = i.lesson_slug
left join public.coding_problems p on p.slug = i.problem_slug;

insert into public.agenda_item_progress (item_id, user_id, status, completed_at) values
  ('cccccccc-0000-4000-8000-000000000001', '11111111-0000-4000-8000-000000000010', 'done', least(rookie_seed.slot(0, 9), now())),
  ('cccccccc-0000-4000-8000-000000000010', '11111111-0000-4000-8000-000000000010', 'done', least(rookie_seed.slot(0, 10), now())),
  ('cccccccc-0000-4000-8000-000000000006', '11111111-0000-4000-8000-000000000010', 'done', rookie_seed.slot(-1, 20)),
  ('cccccccc-0000-4000-8000-000000000007', '11111111-0000-4000-8000-000000000010', 'done', rookie_seed.slot(-1, 21));

-- ---------------------------------------------------------------------------
-- 15. Notes
-- ---------------------------------------------------------------------------
insert into public.notes (user_id, title, content, course_id, lesson_id, problem_id, class_id, created_at, updated_at)
select '11111111-0000-4000-8000-000000000010', n.title, n.body, c.id, l.id, p.id, n.class_id::uuid, n.at, n.at
from (values
  ('Loops — when to use which', E'- `for` loop is useful when the number of iterations is known.\n- `while` when you loop until a condition changes.\n- `do-while` runs **at least once**.', 'java-fundamentals', 'loops', null, null, now() - interval '3 days'),
  ('Primitive vs reference types', E'Primitives hold the value; references hold an address.\n\n```java\nint a = 5;      // value\nString s = "x"; // reference\n```', 'java-fundamentals', 'data-types', null, null, now() - interval '8 days'),
  ('Two Sum — hash map trick', E'Store `target - x` → index while scanning. One pass, O(n).', 'data-structures-algorithms', null, 'two-sum', null, now() - interval '6 days'),
  ('Relational model — keys', E'Primary key = identity. Foreign key = relationship. Candidate keys can be many.', 'dbms', 'relational-model-keys', null, null, now() - interval '1 hour'),
  ('Class notes: Strings & two pointers', E'Instructor tip: draw the two pointers on paper before coding.', 'data-structures-algorithms', null, null, '88888888-0000-4000-8000-000000000007', now() - interval '12 days')
) as n(title, body, course_slug, lesson_slug, problem_slug, class_id, at)
left join public.courses c on c.slug = n.course_slug
left join public.lessons l on l.course_id = c.id and l.slug = n.lesson_slug
left join public.coding_problems p on p.slug = n.problem_slug;

-- ---------------------------------------------------------------------------
-- 16. Announcements (fan out to notifications via trigger)
-- ---------------------------------------------------------------------------
insert into public.announcements (id, title, body, course_id, author_id, pinned, created_at) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'Welcome to the October cohort 👋',
   'Your agenda is updated every morning. Follow your roadmap, show up to classes, and practice a little every day — consistency beats intensity.',
   null, '11111111-0000-4000-8000-000000000001', true, now() - interval '9 days'),
  ('aaaaaaaa-0000-4000-8000-000000000002', 'New DSA assignment released',
   'Implement a singly linked list — due tomorrow. Check the Assignments page.',
   '22222222-0000-4000-8000-000000000002', '11111111-0000-4000-8000-000000000003', false, now() - interval '2 days'),
  ('aaaaaaaa-0000-4000-8000-000000000003', 'Tomorrow''s Java class moved to 11 AM',
   'Java — Loops starts one hour later than usual tomorrow. Same meeting link.',
   '22222222-0000-4000-8000-000000000001', '11111111-0000-4000-8000-000000000002', false, now() - interval '3 hours'),
  ('aaaaaaaa-0000-4000-8000-000000000004', 'Career AMA this week',
   'Bring your resume questions to the open Career AMA session — everyone is welcome.',
   null, '11111111-0000-4000-8000-000000000001', false, now() - interval '1 day');

-- Make the welcome notifications look read
update public.notifications set read_at = now() - interval '8 days'
 where title = 'Welcome to the October cohort 👋';

-- ---------------------------------------------------------------------------
-- 17. Platform settings
-- ---------------------------------------------------------------------------
insert into public.platform_settings (key, value) values
  ('site_name', '"Rookie"'),
  ('allow_signups', 'true'),
  ('default_timezone', '"UTC"'),
  ('announcement_banner', '""'),
  ('maintenance_mode', 'false')
on conflict (key) do update set value = excluded.value;

-- ---------------------------------------------------------------------------
-- Cleanup seed helpers
-- ---------------------------------------------------------------------------
drop schema rookie_seed cascade;
