Project missteps

In here contains the list of things to do or not to do when doing another experimental/exploratory/prototype projects, specifically with wails destop apps.

- Write most of the logic/domain code on the frontend, and use only the backend as a thin layer on filesystem and database. Why? Typescript is still by far more expressive compared to go, and way faster to churn out throw-away code, which is important when exploring. Also, when writing in go, wails does a full-program reload, which results in slower iterations. When things have started to stabilize, and the specifictions have been made clear, then I can slowly move the performance-sensitive code on the backend.

- Spend some more time writing down my thoughts before deciding on large changes, on code or on specs.

- Don't rush and relax. Anxiously rushing leads to badly designed code, pooly understood problem, and terribly executed solution.

- If there have been major changes to specs or requirements, consider rewriting the affected components from scratch, and then re-use or copy only specific parts. Rewriting some parts also has the benefit of a cleaner code because the problem is now better understood.

- Maintenance friday (MF), or have a day dedicated to cleaning, reorganizing, refactoring, documenting and other things to keep the codebase sane. Or if there enough spare time, try out some libraries that could be useful for the project.

And some react-related notes
- avoid using useEffect as much as possible, most of my bugs comes from either wrong deps, or really complicated program flows
   even now, it's hard to get it right, sometimes I really just want an onMount,
   but ends up being not because of the dependencies
- immer and zod are nice tools that simplifies a lot of code, I wonder what tech debts do I incur from using them