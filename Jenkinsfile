// Front end pipeline (run on demand from the local Jenkins: see jenkins/README.md in the back end repository).
pipeline {
    agent any

    options {
        timestamps()
        disableConcurrentBuilds()
        timeout(time: 30, unit: 'MINUTES')
        buildDiscarder(logRotator(numToKeepStr: '20'))
    }

    parameters {
        string(name: 'BRANCH', defaultValue: 'main', description: 'Branch to check.')
        booleanParam(name: 'DEPLOY_BENCH', defaultValue: false, description: 'Publish to the bench after the checks (not available yet).')
    }

    environment {
        // npm's download cache in the Jenkins volume: the next build is faster.
        npm_config_cache = "${JENKINS_HOME}/cache/npm"
        CI = 'true'
    }

    stages {
        stage('Install') {
            steps {
                sh 'npm ci'
            }
        }

        stage('Translations') {
            steps {
                // Every text must exist in Portuguese: a missing one would show in English on the pt-PT site.
                sh '''
                    npm run i18n:extract
                    npm run i18n:sync | tee i18n-sync.log
                    if grep -Eq ', [1-9][0-9]* to translate' i18n-sync.log; then
                        echo 'Some texts have no Portuguese translation yet (see the list above).'
                        exit 1
                    fi
                '''
            }
        }

        stage('Unit tests') {
            steps {
                sh 'npx ng test --watch=false'
            }
        }

        stage('Build') {
            steps {
                // Both languages (/en and /pt-PT), as they will be published.
                sh 'npx ng build'
                archiveArtifacts artifacts: 'dist/bx-sch-4-nbs-front/browser/**', fingerprint: true
            }
        }

        stage('Deploy to bench') {
            when { expression { params.DEPLOY_BENCH } }
            steps {
                // Ready for when the Docker deploy exists; until then it stops here on purpose.
                error('The bench deploy is not set up yet: it comes with the Docker deploy.')
            }
        }
    }
}
