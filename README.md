# Thinkly 

[Project Board](https://github.com/users/cristina-trofimov/projects/4/views/1)

## CI information
*(Add badges or links to your CI pipeline here, e.g., GitHub Actions, Jenkins, CircleCI.)* </br>




## Release Demos
This section will be updated with links to demo videos for each release.

- [Release 1 Demo](#)  
- [Release 2 Demo](#)  
- [Release 3 Demo](#)  



## Project Summary
The goal of this project is to develop a dedicated platform for AlgoTime, a weekly workshop organized by the Software Engineering and Computer Science Society (SCS Concordia), that centralizes problem management, solution submission, and peer collaboration in a single application tailored to AlgoTime’s needs. </br>
</br>
Currently, organizers share algorithmic practice problems via Discord, which limits engagement and interactivity, but the new platform will streamline workflows by allowing organizers to upload problems, attach test cases, monitor submissions, and “spin up” sessions with unique URLs where participants can access six weekly questions, solve them, and appear on a real-time leaderboard open only during AlgoTime hours to encourage participation without turning the event into a constant competition. Students will benefit from a coding environment similar to LeetCode, including runtime and memory usage feedback and premium-like features such as an online debugger, while additional community-driven elements—such as chat channels with class-specific tags, riddles that unlock questions, and past leaderboards that remain viewable—will foster collaboration and maintain attendance throughout the semester. </br>
</br>
The platform will be self-hosted and customizable for long-term sustainability, support multiple programming languages (Python, Java, C++, and JavaScript), and provide both beginners and advanced students with opportunities to learn, mentor, and strengthen their problem-solving skills in a more engaging and interactive environment.



## Getting Started Guide
What does a new developer need to do to get the system up and running?  
Provide setup instructions, dependencies, and commands here.

### Prerequisites
- Node.js / Java / Python version
- Database setup
- Other dependencies

### Installation

Docker commands (to run in root of project)</br>
1-  ```docker compose up --build``` (this will build and run) </br>
2-  ```docker compose up -d``` (run in bakcground)</br>
3-  ```docker compose down``` (clean shut down)</br>
4-  ```docker ps``` (view running containers)</br></br>



installing the frontend</br>
1- ```cd frontend```</br>
2- ```npm install```</br></br>
to run frontend</br>
1- ```npm run dev```</br></br>
to run jest </br>
1- ```npm test```</br></br>

to run cypress</br>
1- cd frontend</br>
2- ``````</br></br>

INSTALLING THE BACKEND</br>
create virtual environement</br>
1- ```python -m venv .venv```</br>
install python dependencies</br>
1- ```pip install -r backend/requirements.txt```</br></br>
to run python</br>
1- cd backend</br>
2- ```python src/main.py```</br>
run pytest</br></br>
1- ```python -m pytest -v```</br>

