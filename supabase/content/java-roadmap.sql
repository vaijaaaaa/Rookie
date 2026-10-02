-- =============================================================================
-- Content: "Java Programming" roadmap
-- Run in the Supabase SQL editor after the migrations. Safe to re-run: it
-- replaces the roadmap with the same slug (learner progress on it is reset).
-- Edit it afterwards in Admin → Roadmaps; link topics to lessons as you
-- create Java courses so completion is tracked automatically.
-- =============================================================================

do $$
declare
  v_roadmap uuid;
  v_section uuid;
  s jsonb;
  t text;
  s_pos int := 0;
  t_pos int;
  v_sections jsonb := $json$
[
  {"title": "Java Basics", "description": "Set up the JDK and an IDE, then learn how a Java program is structured and how values flow through it.",
   "topics": ["Introduction to Java", "Your first app in IntelliJ IDEA", "JDK vs JRE vs JVM", "Input and output", "Identifiers", "Keywords",
              "Variables", "Data types", "Wrapper classes", "Operators", "Decision making (if / else / switch)", "Loops", "Jump statements (break / continue / return)",
              "Project: Number Guessing Game"]},
  {"title": "Methods", "description": "Break programs into small reusable units and control who can call them.",
   "topics": ["Defining and calling methods", "Static vs instance methods", "Access modifiers", "Command-line arguments", "Varargs"]},
  {"title": "Arrays", "description": "Store and process fixed-size collections of values by index.",
   "topics": ["Array basics", "Multi-dimensional arrays", "Jagged arrays", "The Arrays utility class", "Final arrays", "Project: Tic-Tac-Toe"]},
  {"title": "Strings", "description": "Work with immutable text and know when to reach for a mutable builder.",
   "topics": ["String basics", "equals() vs ==", "Common String methods", "The String class", "StringBuffer", "StringBuilder", "String vs StringBuffer vs StringBuilder"]},
  {"title": "Object-Oriented Programming", "description": "Model problems with classes and objects using the four pillars of OOP.",
   "topics": ["Classes and objects", "The this keyword", "The super keyword", "Encapsulation", "Inheritance", "Polymorphism", "Abstraction",
              "The Object class", "Packages", "Project: Simple Banking Application"]},
  {"title": "Interfaces", "description": "Define contracts that classes implement, and use them for flexible designs.",
   "topics": ["Interfaces", "Class vs interface", "Functional interfaces", "Nested interfaces", "Marker interfaces", "Project: Employee Management System"]},
  {"title": "Exception Handling", "description": "Handle runtime errors deliberately so programs fail safely and clearly.",
   "topics": ["Exceptions overview", "try / catch", "final vs finally vs finalize", "throw vs throws", "Custom exceptions", "Chained exceptions",
              "NullPointerException", "Exceptions and method overriding"]},
  {"title": "Regular Expressions", "description": "Validate, search and transform text with java.util.regex.",
   "topics": ["Regex basics", "Pattern and Matcher", "Character classes", "Quantifiers"]},
  {"title": "Memory Management", "description": "Understand where data lives in the JVM and how garbage collection reclaims it.",
   "topics": ["How the JVM manages memory", "How objects are stored", "JVM memory areas", "Stack vs heap", "Garbage collection", "Garbage collector types", "Memory leaks"]},
  {"title": "Generics", "description": "Write type-safe code that works across many types without casting.",
   "topics": ["Generic classes and methods", "Wildcards", "Bounded types", "Type erasure"]},
  {"title": "Collections Framework", "description": "Pick the right data structure from List, Set, Queue and Map — and iterate, sort and compare them.",
   "topics": ["The Collection interface", "The Collections class", "List and ArrayList", "Set and HashSet", "Queue and Deque", "Map and HashMap",
              "Iterator", "Comparable", "Comparator", "Project: Face Detection System"]},
  {"title": "Java 8+ Features", "description": "Write concise, functional-style Java with lambdas and streams.",
   "topics": ["Lambda expressions", "Predicate", "Consumer", "Supplier", "Method references", "Streams API", "Optional", "Collectors"]},
  {"title": "Date and Time API", "description": "Handle dates, times, durations and formatting with java.time.",
   "topics": ["java.time overview", "LocalDate", "LocalTime", "LocalDateTime", "Duration", "Period", "DateTimeFormatter"]},
  {"title": "Multithreading and Concurrency", "description": "Run work in parallel safely: threads, synchronization, locks and pools.",
   "topics": ["Threads basics", "start() vs run()", "The main thread", "Thread priority", "Synchronization and thread safety", "Locks and ReentrantLock",
              "Deadlocks", "Thread pools", "Project: Snake Game"]},
  {"title": "File Handling", "description": "Read and write files with java.io and java.nio.",
   "topics": ["Java I/O overview", "Reader", "Writer", "Working with files", "BufferedReader", "BufferedOutputStream", "FilePermission", "FileDescriptor", "Project: Text Editor"]},
  {"title": "Networking", "description": "Build client-server programs over TCP and UDP with java.net.",
   "topics": ["Networking basics", "Socket programming", "ServerSocket", "URL and URLConnection", "Project: Chat Application"]},
  {"title": "JDBC", "description": "Connect Java applications to relational databases and run queries safely.",
   "topics": ["JDBC overview", "JDBC drivers", "Opening a connection", "Statement vs PreparedStatement vs CallableStatement", "Transactions", "ResultSet",
              "Database metadata", "Connection pooling"]},
  {"title": "Practice and Interview Prep", "description": "Consolidate with topic quizzes, coding problems and common interview questions.",
   "topics": ["Topic-wise quizzes", "Java coding practice problems", "Core Java interview questions", "Advanced Java interview questions"]}
]
$json$;
begin
  delete from public.roadmaps where slug = 'java-programming';

  insert into public.roadmaps (slug, title, summary, description, difficulty, estimated_weeks, goal, prerequisites, is_published)
  values (
    'java-programming',
    'Java Programming',
    'From your first Hello World to collections, streams, concurrency and JDBC.',
    E'A complete path through core Java. Start with syntax and control flow, build a solid object-oriented foundation, then move on to collections, functional-style Java 8+ features, concurrency, files, networking and databases.\n\nEach section ends with practice — and several include a small project to tie the ideas together.',
    'beginner', 16, 'software_developer',
    array['Comfortable using a computer and a code editor', 'No prior programming experience required'],
    true
  )
  returning id into v_roadmap;

  for s in select * from jsonb_array_elements(v_sections) loop
    s_pos := s_pos + 1;
    insert into public.roadmap_nodes (roadmap_id, parent_id, kind, title, description, position)
    values (v_roadmap, null, 'section', s ->> 'title', s ->> 'description', s_pos)
    returning id into v_section;

    t_pos := 0;
    for t in select jsonb_array_elements_text(s -> 'topics') loop
      t_pos := t_pos + 1;
      insert into public.roadmap_nodes (roadmap_id, parent_id, kind, title, position)
      values (v_roadmap, v_section, 'topic', t, t_pos);
    end loop;
  end loop;
end $$;

-- Check: sections and topics created
select r.title,
       count(*) filter (where n.kind = 'section') as sections,
       count(*) filter (where n.kind = 'topic')   as topics
from public.roadmaps r join public.roadmap_nodes n on n.roadmap_id = r.id
where r.slug = 'java-programming'
group by r.title;
