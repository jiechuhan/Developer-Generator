const fs = require("fs");
const inquirer = require("inquirer");
const axios = require("axios");
const util = require("util");
const convertFactory = require("electron-html-to");

const generateHTML = require("./generateHTML");
const writeFileAsync = util.promisify(fs.writeFile);


const questions = [
    {
        type: "input",
        message: "Enter your GitHub username",
        name: "username"
    },
    {
        type: "checkbox",
        message: "What's your favorite color?",
        name: "favColor",
        choices: ["green", "blue", "pink", "red"]
    }
];

inquirer
    .prompt(questions)
    .then(function ({ username, favColor }) {
        // get favorite color
        let passInfo = {
            color: favColor[0]
        }

        // get basic info
        const queryUrl = `https://api.github.com/users/${username}`;
        axios
            .get(queryUrl)
            .then(function (res) {
                const datas = res.data;

                const { avatar_url, name, location, html_url, company, blog, bio, public_repos, followers, following } = datas;

                passInfo.image = avatar_url;
                passInfo.name = name;
                passInfo.location = location;
                passInfo.GitHubProfile = html_url;
                passInfo.company = company;
                passInfo.blog = blog;
                passInfo.bio = bio;
                passInfo.publicRepo = public_repos;
                passInfo.followers = followers;
                passInfo.following = following;
            })


        // go through all repos and add stars #
        const repoUrl = `https://api.github.com/users/${username}/repos?per_page=100`;
        axios
            .get(repoUrl)
            .then(function (res) {
                const datas = res.data;

                let star = 0;
                for (const data of datas) {
                    const { stargazers_count } = data;
                    star += stargazers_count;
                };

                passInfo.star = star;
            })

            // write to html
            .then(function () {
                const html = generateHTML.generateHTML(passInfo);
                return writeFileAsync("index.html", html);
            })

            // conver to pdf
            .then(function () {
                fs.readFile('index.html', 'utf8', (err, htmlString) => {
                    const conversion = convertFactory({
                        converterPath: convertFactory.converters.PDF,
                        allowLocalFilesAccess: true
                    });
                    conversion({ html: htmlString }, (err, result) => {
                        if (err) return console.error(err);
                        result.stream.pipe(fs.createWriteStream('profile.pdf'));
                        conversion.kill();
                    });
                });
            })
    });
