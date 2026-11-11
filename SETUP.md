# ReFound — Local Runtime Setup

This note exists so a teammate can put their machine in the same state as the
machine this service was set up on. It records **what the commands actually
printed**, not what the tools are called in an installer.

**Machine recorded on:** 2026-11-11
**OS:** Linux Mint 22.3 x86_64 (Ubuntu 24.04 base), kernel 7.0.0-42-generic
**Shell:** zsh 5.9
**Hardware:** Dell G15 5530, 13th Gen Intel i7-13650HX, 15.30 GiB RAM

## Why exact versions and not "latest"

"Latest" is a moving target. It means a different image, a different Compose
parser and a different client on the day your teammate installs, so two people
can follow the same instructions and end up with two different machines. When
`docker compose up` behaves differently for one person, nobody can tell whether
the cause is the code or the install. Pinned versions make a difference in
behaviour something we can actually check.

## The four sprint tools

| # | Tool | Command run | Output on this machine |
| --- | --- | --- | --- |
| 1 | Docker Engine (container runtime) | `docker version --format '{{.Server.Version}}'` | `29.1.3` |
| 2 | Docker Compose | `docker compose version` | `Docker Compose version 2.40.3+ds1-0ubuntu1~24.04.1` |
| 3 | Git | `git --version` | `git version 2.43.0` |
| 4 | PostgreSQL client | `psql --version` | `psql (PostgreSQL) 16.15 (Ubuntu 16.15-0ubuntu0.24.04.1)` |

One line that prints all four, the same way it was captured here:

```bash
docker version --format '{{.Server.Version}}'; docker compose version; git --version; psql --version
```

Note on the runtime command: it asks for the **server** version, not the client.
`docker --version` only prints the client, and a client with no daemon running
behind it will still answer happily. The server version is the one that proves
the daemon is up.

Note on `psql`: the client was not present on this machine at first —
`zsh: command not found: psql`. It was installed from the Ubuntu package
`postgresql-client`, which is why the version string carries the
`0ubuntu0.24.04.1` build tag. On Ubuntu 24.04 / Linux Mint 22.x:

```bash
sudo apt update && sudo apt install -y postgresql-client
```

## Local container check (hello-world)

Command:

```bash
docker run --rm hello-world
```

Result, exactly as printed:

```text
Unable to find image 'hello-world:latest' locally
latest: Pulling from library/hello-world
4f55086f7dd0: Pull complete
d5e71e642bf5: Download complete
Digest: sha256:c567b231f65614688711a75f31518a064258a51d442117a3e771a3a8fdba78ef
Status: Downloaded newer image for hello-world:latest

Hello from Docker!
This message shows that your installation appears to be working correctly.

To generate this message, Docker took the following steps:
 1. The Docker client contacted the Docker daemon.
 2. The Docker daemon pulled the "hello-world" image from the Docker Hub.
    (amd64)
 3. The Docker daemon created a new container from that image which runs the
    executable that produces the output you are currently reading.
 4. The Docker daemon streamed that output to the Docker client, which sent it
    to your terminal.

To try something more ambitious, you can run an Ubuntu container with:
 $ docker run -it ubuntu bash

Share images, automate workflows, and more with a free Docker ID:
 https://hub.docker.com/

For more examples and ideas, visit:
 https://docs.docker.com/get-started/
```

`Hello from Docker!` is the line that matters. It means the client, the daemon
and the image pull all worked.

## Host for this sprint

**Render free tier** — one host, and only one. Nothing is deployed from this
note; the host is recorded here so we do not end up with half the team on a
different platform.

There is no second host. No Oracle Cloud instance, no campus VM, no local
server standing in as a fallback. A second host doubles what has to be kept
working and makes "it works for me" impossible to debug. If Render turns out to
be the wrong choice, that is a team decision and a change to this line — not a
quiet second deployment.

## Payment

No payment card was entered, and no paid plan or trial was used for any tool,
runtime or host in this setup. Docker Engine, Docker Compose, Git, the
PostgreSQL client and the Render free tier were all used at zero cost.

## How a teammate matches this machine

1. **Install the runtime.** Docker Engine 29.1.3 on Ubuntu 24.04 / Linux Mint
   22.x comes from Docker's own apt repository. Install it, then add yourself
   to the `docker` group so you do not need `sudo` for every command:

   ```bash
   sudo usermod -aG docker $USER
   newgrp docker
   ```

2. **Start the daemon and confirm it is actually up.** This is the step people
   skip — an installed Docker is not a running Docker:

   ```bash
   sudo systemctl enable --now docker
   docker version --format '{{.Server.Version}}'
   ```

   Expect `29.1.3`. If the command errors instead of printing a number, stop
   and fix that before going further.

3. **Compare all four versions** against the table above:

   ```bash
   docker version --format '{{.Server.Version}}'
   docker compose version
   git --version
   psql --version
   ```

   Install the Ubuntu 24.04 packages for Git and the PostgreSQL client if they
   are missing:

   ```bash
   sudo apt install -y git postgresql-client
   ```

4. **Run the container check** and look for `Hello from Docker!`:

   ```bash
   docker run --rm hello-world
   ```

5. **You match when** all four versions read the same as the table and the
   hello-world line appears. Anything else, tell the team before you start
   writing code — a different version is a real difference, not a detail.

## When it does not work

**`Cannot connect to the Docker daemon at unix:///var/run/docker.sock. Is the
docker daemon running?`** — Docker is installed but the daemon is not running.
Start it with `sudo systemctl enable --now docker` and retry. This is the most
common failure and it is not a code problem.

**`permission denied while trying to connect to the Docker daemon socket`** —
you are not in the `docker` group yet. Run the `usermod` line above and open a
new shell (or `newgrp docker`). Do not "fix" it by putting `sudo` in front of
every command.

**`docker: 'compose' is not a docker command`** — the Compose plugin is
missing. `docker` on its own is not enough, because Compose is what starts the
service and PostgreSQL together. Install `docker-compose-v2` from the same
Docker apt repository and check with `docker compose version`.

**`zsh: command not found: psql`** — the PostgreSQL client is missing (this
happened on this machine). Install it with
`sudo apt install -y postgresql-client`.

**Image pull fails with a network or proxy error** — the daemon cannot reach
Docker Hub. Check the connection and any proxy settings before assuming the
image name is wrong.

**A step needs admin rights you do not have** — ask the mentor. Do not switch
to a paid plan or a second host to work around a permissions problem.
