const chalk = require('chalk');
const BaseGenerator = require('generator-jhipster/generators/generator-base');
const jhipsterConstants = require('generator-jhipster/generators/generator-constants');

const genUtils = require('../utils');
const packagejs = require('../../package.json');

module.exports = class extends BaseGenerator {
    get initializing() {
        return {
            readConfig() {
                this.entityConfig = this.options.entityConfig;
                this.jhipsterAppConfig = this.getJhipsterAppConfig();
                if (!this.jhipsterAppConfig) {
                    this.error('Can\'t read .yo-rc.json');
                }
            },

            setSource() {
                this.sourceRoot(`${this.sourceRoot()}/../../app/templates`);
            },

            checkDBType() {
                if (this.jhipsterAppConfig.databaseType !== 'sql') {
                    this.abort = true;
                }
            },
            displayLogo() {
                if (this.abort) {
                    return;
                }
                this.log('');
                this.log(`${chalk.blue('██████╗ ')}${chalk.red('██')}${chalk.blue('╗ ██████╗ ██████╗ ██╗   ██╗ ██████╗ ')}`);
                this.log(`${chalk.blue('██╔══██╗██║██╔════╝ ██╔══██╗██║   ██║██╔════╝ ')}`);
                this.log(`${chalk.blue('██████╔╝██║██║  ███╗██████╔╝██║   ██║██║  ███╗')}`);
                this.log(`${chalk.blue('██╔══██╗██║██║   ██║██╔══██╗██║   ██║██║   ██║')}`);
                this.log(`${chalk.blue('██████╔╝██║╚██████╔╝██████╔╝╚██████╔╝╚██████╔╝')}`);
                this.log(`${chalk.blue('╚═════╝ ╚═╝ ╚═════╝ ╚═════╝  ╚═════╝  ╚═════╝ ')}`);
                this.log(chalk.white(`Running ${chalk.bold.blue('JHipster Audit Helper')} Generator! ${chalk.yellow(`v${packagejs.version}\n`)}`));
            },

            validate() {
                // this shouldnt be run directly
                if (!this.entityConfig) {
                    this.env.error(`${chalk.red.bold('ERROR!')} This sub generator should be used only from JHipster and cannot be run directly...\n`);
                }
            },

            getAuditedEntities() {
                this.auditedEntities = this.getExistingEntities()
                    .filter(entity => entity.definition.enableEntityAudit)
                    .map(entity => entity.name);
            },
        };
    }

    prompting() {
        if (this.abort) {
            return;
        }

        const done = this.async();
        const entityName = this.entityConfig.entityClass;
        const prompts = [
            {
                type: 'confirm',
                name: 'enableAudit',
                message: `Do you want to enable audit for this entity (${entityName})?`,
                default: true,
            },
        ];

        this.prompt(prompts).then((props) => {
            this.props = props;
            // To access props later use this.props.someOption;
            this.enableAudit = props.enableAudit;
            if (
                this.enableAudit &&
                !this.auditedEntities.includes(entityName)
            ) {
                this.auditedEntities.push(entityName);
            }
            done();
        });
    }
    get writing() {
        return {
            updateFiles() {
                if (this.abort) {
                    return;
                }
                if (!this.enableAudit) {
                    return;
                }

                // read config from .yo-rc.json
                this.baseName = this.jhipsterAppConfig.baseName;
                this.packageName = this.jhipsterAppConfig.packageName;
                this.packageFolder = this.jhipsterAppConfig.packageFolder;
                this.clientFramework = this.jhipsterAppConfig.clientFramework;
                this.clientPackageManager = this.jhipsterAppConfig.clientPackageManager;
                this.buildTool = this.jhipsterAppConfig.buildTool;
                this.cacheProvider = this.jhipsterAppConfig.cacheProvider;

                // use constants from generator-constants.js
                const javaDir = `${jhipsterConstants.SERVER_MAIN_SRC_DIR +
                    this.packageFolder}/`;
                const resourceDir = jhipsterConstants.SERVER_MAIN_RES_DIR;
                this.javaTemplateDir = 'src/main/java/package';

                if (this.entityConfig.entityClass) {
                    this.log(`\n${chalk.bold.green('I\'m updating the entity for audit ')}${chalk.bold.yellow(this.entityConfig.entityClass)}`);

                    const entityName = this.entityConfig.entityClass;
                    const jsonObj = this.entityConfig.data;
                    this.changelogDate =
                        this.entityConfig.data.changelogDate ||
                        this.dateFormatForLiquibase();
                    genUtils.updateEntityAudit.call(
                        this,
                        entityName,
                        jsonObj,
                        javaDir,
                        resourceDir,
                        true
                    );
                }
            },

            updateConfig() {
                if (this.abort) {
                    return;
                }
                this.updateEntityConfig(
                    this.entityConfig.filename,
                    'enableEntityAudit',
                    this.enableAudit
                );
            },
        };
    }

    end() {
        if (this.abort) {
            return;
        }
        if (this.enableAudit) {
            this.log(`\n${chalk.bold.green('Entity audit enabled')}`);
        }
    }
};
