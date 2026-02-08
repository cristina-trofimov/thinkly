# Thinkly 

[Project Board](https://github.com/users/cristina-trofimov/projects/4/views/1)

## Diversity Statement
The Thinkly platform is built to be fair and welcoming for everyone. We ensure equal access by making the system free (no paywalls) and easily used on any device through a simple web browser. To support diversity in learning, our coding judge accepts many programming languages, allowing users to learn or use what they prefer. 
</br></br>
For more information, please visit our [wiki page](https://github.com/cristina-trofimov/thinkly/wiki/Diversity-statement).


## CI information
[CI Pipeline](https://github.com/cristina-trofimov/thinkly/blob/main/.github/workflows/CI_Pipeline.yml)
[SonarQube Pipeline](https://github.com/cristina-trofimov/thinkly/blob/main/.github/workflows/sonarqube.yml)
[Pipelines wiki](https://github.com/cristina-trofimov/thinkly/wiki/Github-Pipelines)




## Release Demos
This section will be updated with links to demo videos for each release.

- [Release 1 Demo](https://drive.google.com/drive/folders/1IHm0oKIzjOYb3NXHU9eBGZ0HI0JRKwAN?usp=sharing)
- [Release 2 Demo](https://drive.google.com/drive/folders/12FV8AMvpoIW5p8ssOJuk0g9RFR56MdsN?usp=sharing), Deployed site: https://thinklyscs.com/
- [Release 3 Demo](https://drive.google.com/drive/folders/1puGLNScmyAk6Il7cm_1U-D8dlgG0KH_W?usp=sharing)



## Project Summary
The goal of this project is to develop a dedicated platform for AlgoTime, a weekly workshop organized by the Software Engineering and Computer Science Society (SCS Concordia), that centralizes problem management, solution submission, and peer collaboration in a single application tailored to AlgoTime’s needs. </br>
</br>
Currently, organizers share algorithmic practice problems via Discord, which limits engagement and interactivity, but the new platform will streamline workflows by allowing organizers to upload problems, attach test cases, monitor submissions, and “spin up” sessions with unique URLs where participants can access six weekly questions, solve them, and appear on a real-time leaderboard open only during AlgoTime hours to encourage participation without turning the event into a constant competition. Students will benefit from a coding environment similar to LeetCode, including runtime and memory usage feedback and premium-like features such as an online debugger, while additional community-driven elements—such as chat channels with class-specific tags, riddles that unlock questions, and past leaderboards that remain viewable—will foster collaboration and maintain attendance throughout the semester. </br>
</br>
The platform will be self-hosted and customizable for long-term sustainability, support multiple programming languages (Python, Java, C++, and JavaScript), and provide both beginners and advanced students with opportunities to learn, mentor, and strengthen their problem-solving skills in a more engaging and interactive environment.

## Website Hosting
https://thinklyscs.com/

## Getting Started Guide
What does a new developer need to do to get the system up and running?  
Provide setup instructions, dependencies, and commands here.

### Prerequisites
- Node.js / Java / Python version
- Database setup
- Other dependencies


### Installation with Docker

Docker commands (to run in root of project)</br>
**have docker desktop installed and opened**</br>
1-  ```docker compose up --build``` (this will build and run) </br>
2-  ```docker compose up -d``` (run in bakcground)</br>
3-  ```docker compose down``` (clean shut down)</br>
4-  ```docker ps``` (view running containers)</br></br>


|| **Frontend** | **Backend** |
|------|-----------------|-----------------|
| **Installation** | 1- ```cd frontend```</br>2- ```npm install```</br></br> | **Create virtual environment** </br>1- ```cd backend```</br>2- ```python -m venv .venv```</br></br> **Install Python dependencies** </br>1- ```cd backend```</br>2- ```pip install -r src/requirements.txt```</br></br>|
| **Run** | 1- ```cd frontend```</br>2- ```npm run dev```</br></br> | 1- ```cd backend```</br>2- ```python src/main.py```</br></br> |
| **Run Tests** | **Jest Tests**</br>1- ```cd frontend```</br>2- ```npm test```</br></br> **Cypress**</br>1- ```cd frontend```</br>2- ```npm run cypress:open```</br></br> | **Pytest**</br>1- ```cd backend```</br>2- ```python -m pytest -v```</br> |
| **Linting** | 1- ```cd frontend```</br>2- ```npm run lint```</br>or </br>2- ```npm run lint -- --fix``` (will auto-fix some issues) </br> | 1- ```cd backend```</br>2- ```ruff check src/```</br>or </br>2- ```ruff check src/ --fix``` (will auto-fix some issues)</br> |

## Database Creation
1. Download **pgAdmin4**
2. Right click on `Servers`, select `Register` then `Server`
3. Name it whatever you want in the `General` tab
4. Go to `Connection` tab, name it  ```localhost``` again and set Port to 5432 (if you change either of these, then make sure to update src/db.py so the local provider can match the postgres one)
5. Set username and password (we set both to postgres by default but you can change it to whatever, just make sure to update db.py)
6. Still in **pgAdmin4**, right click on `Databases`, and create a new one
7. Name it **ThinklyDB**
8. Make sure the `Locale Provider` under the `Definition` tab matches the template you use (libc or icu, or whatever else)
9. In your terminal, cd backend then run ```python src/init_db.py```
10. Then cd src (still in backend) and run ```python -m populateDB```
