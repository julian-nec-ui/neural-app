pipeline {
    agent any

    options {
        timeout(time: 1, unit: 'HOURS')
        buildDiscarder(logRotator(numToKeepStr: '5'))
        disableConcurrentBuilds()
    }

    stages {
        stage('Checkout') {
            steps {
                // Pulls the latest code from the GitHub repository
                checkout scm
            }
        }

        stage('Deploy Neural App UI') {
            steps {
                echo '🚀 Deploying React UI via Docker Compose...'
                
                // 1. Remove old containers to prevent port conflicts
                // We use the specific UI compose file we created
                script {
                    if(isUnix()) {
                        sh 'docker-compose -f docker-compose-ui.yml down || echo no containers to stop'
                    } else {
                        bat 'docker-compose -f docker-compose-ui.yml down || echo no containers to stop'
                    }
                }
                
                // 2. Build and launch the UI in detached mode
                // --build ensures that any changes to the Dockerfile or code are applied
                script {
                    if(isUnix()) {
                        sh 'docker-compose -f docker-compose-ui.yml up --build -d'
                    } else {
                        bat 'docker-compose -f docker-compose-ui.yml up --build -d'
                    }
                }
                
                echo '✅ UI is now live at http://localhost:3000'
            }
        }
    }
    
    post {
        success {
            echo 'Frontend Pipeline Successful! Your site is updated. 🎨'
        }
        failure {
            echo 'Frontend Pipeline Failed. Check the Docker logs for errors.'
        }
    }
}
