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
                checkout scm
            }
        }

        stage('Deploy Neural App UI') {
            steps {
                echo '🚀 Deploying React UI via Docker Compose...'

                withCredentials([
                  string(credentialsId: 'RESEND_API_KEY', variable: 'RESEND_API_KEY'),
                  string(credentialsId: 'NEXT_PUBLIC_VERIFIED_SENDER', variable: 'NEXT_PUBLIC_VERIFIED_SENDER')
                ]) {
                
                    script {
                        // 1. Remove old containers to prevent port conflicts
                        if(isUnix()) {
                            sh 'docker rm -f file-gallery || echo no ghost container'
                        } else {
                            bat 'docker rm -f file-gallery || echo no ghost container'
                        }
                    }

                    script {
                        if(isUnix()) {
                            sh 'docker-compose -f docker-compose.yml down || echo no containers to stop'
                        } else {
                            bat 'docker-compose -f docker-compose.yml down || echo no containers to stop'
                        }
                    }
                    
                    script {
                        if(isUnix()) {
                            // ✅ FIXED: Using single quotes to prevent Groovy Interpolation
                            // Use $VARIABLE for Linux shell
                            sh 'echo "RESEND_API_KEY=$RESEND_API_KEY" > .env.local'
                            sh 'echo "NEXT_PUBLIC_VERIFIED_SENDER=$NEXT_PUBLIC_VERIFIED_SENDER" >> .env.local'
                            sh 'docker-compose -f docker-compose.yml up --build -d'
                            sh 'rm .env.local'
                        } else {
                            // ✅ FIXED: Using single quotes and %VARIABLE% for Windows CMD
                            bat 'echo RESEND_API_KEY=%RESEND_API_KEY% > .env.local'
                            bat 'echo NEXT_PUBLIC_VERIFIED_SENDER=%NEXT_PUBLIC_VERIFIED_SENDER% >> .env.local'
                            bat 'docker-compose -f docker-compose.yml up --build -d'
                            bat 'del .env.local'
                        }
                    }
                    
                    echo '✅ UI is now live at http://localhost:3000'
                }
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
