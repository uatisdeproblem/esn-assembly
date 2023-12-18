# Contribute in the development

The main objective of the project is to **further develop and maintain the Assembly app**.

The app is available through the major desktop and mobile browsers.

## Architecture overview

### Basics

The project's architecture identifies two modular blocks: [**front-end** and **back-end**](https://www.indeed.com/career-advice/career-development/front-end-vs-back-end).

### Languages

The front-end's source code is written with **web languages**; therefore, it's necessary to have basics in:

- [HTML](https://www.w3schools.com/html/): handles the structure of our pages.
- [CSS](https://www.w3schools.com/css/): holds the presentation (style) of our pages.
- [JavaScript](https://www.w3schools.com/js/): handles the business logic of our pages.

Quick example:

<img alt="web languages" src="https://user-images.githubusercontent.com/3777036/147551619-f65cebb7-91a8-4e21-8b75-bd246f1c0847.png" width="800">

Through [web development](https://www.freecodecamp.org/news/html-css-and-javascript-explained-for-beginners/), we **created a [web app](https://medium.com/@essentialdesign/website-vs-web-app-whats-the-difference-e499b18b60b4)**; specifically, a [SPA (Single-Page Application)](https://www.bloomreach.com/en/blog/2018/07/what-is-a-single-page-application.html).

To be precise, to handle the business logic of our app we don't use JavaScript directly, rather a "superset" of it, named **[TypeScript](https://www.typescriptlang.org)**; in a few words, it's basically [JavaScript with syntax for types](https://www.typescriptlang.org/why-create-typescript). _Therefore, if you know JavaScript, you won't have any problem; also: if you know PHP, you will find more similarities._

If you need it, online, you will find tons of free resources, tutorials and crash courses on these languages.

### Frameworks

Of course, we didn't reinvent the wheel and wrote code from scratch; we instead took advantage of frameworks. Specifically:

- **[Angular](https://angular.io/): a development platform built on TypeScript**. If you have never used it before, I suggest watching [reading the official documentation](https://angular.io/guide/what-is-angular).
- **[Ionic](https://ionicframework.com): a library of mobile-optimized UI components, gestures and tools**. Using Ionic is very easy: you can explore the [components library](https://ionicframework.com/docs/components) and mostly copy/paste the "blocks" that you need.

Here's an example of how the two frameworks affect the graphic result of our programming:

<img width="1000" alt="frameworks" src="https://github.com/uatisdeproblem/egm-app/assets/3777036/283910da-a376-4e27-80ac-ec0222e8f5ad">

## Project structure

Here's the project folders/files structure:

<img width="300" alt="initial project structure" src="https://github.com/uatisdeproblem/egm-app/assets/3777036/8c89e522-7884-409a-84cb-b55850f4a4a6">

_Don't worry: you won't need to know or edit most of this stuff!_

You will spend 90% of your time working on the `front-end/src/app/tabs` folder, where you will find two types of components:

- Pages: are the pages accessible in the app by a particular link (e.g. `/user`).
- Components: are the building blocks that compose a page (e.g. `<app-user-card />`).

Each component/page is represented by a set of files (not all of them are always present):

- `user.page.html`: contains the HTML structure.
- `user.page.scss`: contains the style/presentation code (CSS) .
- `user.page.ts`: contains the business logic (Typescript).
- `user-routing.module.ts`: contains the routing instructions (e.g. the page is reachable through `/user`).
- `user.module.ts`: contains the imports of the related components and modules.
- `user.service.ts`: contains the API requests and the logics to interact with the user's data model.

## Developer tools and first steps

### Make sure you

- Have installed [Git](https://git-scm.com): for code versioning.
- Have an account on [GitHub](https://github.com): where our code repository and issues (User Stories) are.
- Have installed [Visual Studio Code](https://code.visualstudio.com): the IDE (Integrated Development Environment) that we use to write code. _Not mandatory_ — you can use the tool you prefer — but suggested, since it has some extensions that will help in your job.
- Have installed [Node.js](https://nodejs.org/en/download/): we need to access the [NPM (Node Package Manager)](https://docs.npmjs.com/about-npm) to install all the libraries and dependencies of our source code.
- If you use [Google Chrome](https://www.google.com/chrome/), you can install the [Angular Developer Tools](https://chrome.google.com/webstore/detail/angular-devtools/ienfalfjdbdpebioblfackkekamfmbnh) extension to access some specific Angular debug features.

You may have most of this stuff already on your dev computer, but if you need help in installing or configuring any tools, let us know!

### Next steps

- **Get confident with the main languages (HTML, CSS, TypeScript) and frameworks (Angular, Ionic)** by reading some documentation and following any tutorial or course (you can find plenty of them for free online). _If you have any questions, We're here to help!_ 😄
- **Explore the repository on GitHub** to peek at the base source code and get to know the User Stories (Issues) that express the next features that we will implement.
- **Clone the repository locally** to have the source code ready on your computer. [Read more about cloning a repository from GitHub](https://docs.github.com/en/desktop/contributing-and-collaborating-using-github-desktop/adding-and-cloning-repositories/cloning-a-repository-from-github-to-github-desktop).
- **Start experimenting** by running the local environment (localhost) and changing the code to your likings. See below for further instructions.

### Starting the local environment

Make sure you have installed the project's latest libraries and dependencies (and compiled the models) by running in the terminal, from project's root:

```
cd back-end
npm install
cd ../front-end
npm install
```

Start the project locally by running (from the `front-end` folder):

```
npm run start
```

or from Visual Studio Code: `Run > Start debugging` or press `F5` (`Fn+F5` in some computers).

This will start a local development environment that can be accessed (once it finishes loading) with any browser (Google Chrome is suggested) at the address: `http://localhost:8100`.

Any change that you make to the code will be automatically reloaded in the browser (you should see changes almost instantly).

If you want to debug your code, you can open the [Developer Tools](https://developer.mozilla.org/en-US/docs/Learn/Common_questions/What_are_browser_developer_tools) of your browser.

⚠️⚠️ Since the app supports **development** and **production** stages, you need decide which to use when you run the front-end; in `/front-end/src/environments/environment.idea.ts` you can switch between "dev" and "prod" with the variable `api.stage`. Note: _dev_ and _prod_ environment use the same user base (the accounts to log-in), but they have their own databases; this means that organizations, venues, rooms, speakers, sessions and user profiles will be different based on which environment you’re referring to with the variable `api.stage`.

### Tackle an issue, develop and commit changes

_When you're ready to try tackling a User Story, let us know!_ 💪

You will be assigned to the related Issue on GitHub, and [you will start working on a new branch](https://emily-ha-35637.medium.com/how-and-why-to-use-a-feature-branch-in-github-48a9b23b7348).

You will **implement in your local code the changes that make the new feature work**. It's always a good practice to carefully test the code that we implement!

When we are confident with the results, we can **commit our changes and create a Pull Request** to merge the changes in the main branch.

We will **discuss together** whether we can fix any problem or improve the code; finally, we will merge the changes and publish the new feature in the app.

Oh, [here you can find some best pratices](https://iter-idea.notion.site/Git-conventions-7f411b668d984eb3a05a03dfcae25d6f) about managing/committing/reviewing our code: it would be nice to follow them. 😉

P.S. [here's anohter resource](https://github.com/uatisdeproblem/egm-app/files/13060363/ITER.IDEA.s.cloud.solutions_.what.s.under.the.hood.CommIT.2023.pdf) that presents everything you've read here.
