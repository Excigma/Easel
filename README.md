# Easel

Easel is a Discord Bot created to interact with Canvas and Panopto, acting as a bridge between Discord and University of Auckland hosted services to help students stay on top of content and deadlines.

During semester one of University, I've noticed that I haven't checked my Canvas announcements frequently enough, and thus missed a quiz and some important notes. Easel was a Discord integration that was made to fill this gap.

The first few iterations of Easel used webhooks to send messages to various Discord channels, and used a username + password combo to authenticate into The University of Auckland's Single Sign On service, later iterations used session cookies; however it was still not done "properly" and the code quality was horrendous (a single file script exceeding 800 lines) - becoming difficult to maintain.

Easel uses and is powered by [Canvas LMS' API](https://canvas.instructure.com/doc/api/) and other neat features integrated into Canvas LMS to check for announcements and to check for upcoming due tasks.

## Contributors

Thanks to these people who contributed to this or previous iterations of this project:

- Canvas LMS for proving an API and other integrations that make all of this possible, and the previous generation of Easel, easily possible
- [@JamesNZL](https://github.com/JamesNZL) - for contributing source code to the previous generation of Easel that has carried onto this iteration
- [@diced](https://github.com/diced) - for contributing ideas and source code to the previous generation and current generation of Easel, and for collaborating and making most of the project's icon
