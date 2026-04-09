# Pine Lake Covenant Church – Website Prototype

This repository is a fast-iteration prototype for the Pine Lake Covenant Church website.

Goals:

- Experiment with information architecture for new visitors
- Explore a photo-rich, editorial visual style
- Optimize for young families and first-time guests
- Stay static, fast, and GitHub Pages–friendly

Non-goals (for now):

- CMS integration
- Full Church Center API integration
- Long-term hosting decisions

This site is built with Astro and deployed via GitHub Pages.

## Run With Apple `container` (macOS)

This project includes a `Dockerfile`, which works with Apple's `container` CLI.

### Prerequisites

- Install and configure Apple's `container` tool
- Start container services:

```bash
container system start
```

Optional, if you want friendly local DNS names:

```bash
container system property set dns.domain internal
```

### Build the image

From the repo root:

```bash
container build --tag plcc-web .
```

### Run the site

```bash
container run --name plcc --detach --rm plcc-web
```

The site is served by NGINX on port `8080` inside the container.

If DNS domain is set to `internal`, open:

`http://plcc.internal:8080`

Otherwise, use:

```bash
container ls
```

Then open `http://<container-ip>:8080`.

### Stop the site

```bash
container stop plcc
```

Because `--rm` is used, the container is automatically removed after stopping.

## Develop In A Container (No Host npm)

If you want isolation while editing, run Astro dev inside a Node container and bind-mount this repo.

### Start containerized dev server

From the repo root:

```bash
npm run dev:container
```

Open:

- `http://plcc-dev.internal:4321` (if you have set `dns.domain=internal`)
- Or `http://localhost:4321`

### Stop containerized dev server

```bash
npm run dev:container:stop
```

Notes:

- This gives live reload while editing files locally.
- `node_modules` stays inside the container filesystem (`tmpfs`), not in your repo.
- Because `--rm` is used, the container is removed when stopped.

### Troubleshooting

If build fails due to Rosetta requirements and you only need ARM builds, disable Rosetta for `container` builds:

```bash
container system property set build.rosetta false
container system stop
container system start
```
