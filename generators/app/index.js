const chalk = require('chalk');
const semver = require('semver');
const BaseGenerator = require('generator-jhipster/generators/generator-base');
const jhipsterConstants = require('generator-jhipster/generators/generator-constants');
const fs = require('fs');
const glob = require('glob');

const genUtils = require('../utils');
const packagejs = require('../../package.json');

module.exports = class extends BaseGenerator {
    get initializing() {
        return {
            init(args, opts) {},
            readConfig() {
                this.jhipsterAppConfig = this.getJhipsterAppConfig();
                if (!this.jhipsterAppConfig) {
                    this.error('Can\'t read .yo-rc.json');
                }
            },
            displayLogo() {
                this.log('');
                this.log(`${chalk.blue('██████╗ ')}${chalk.red('██')}${chalk.blue('╗ ██████╗ ██████╗ ██╗   ██╗ ██████╗ ')}`);
                this.log(`${chalk.blue('██╔══██╗██║██╔════╝ ██╔══██╗██║   ██║██╔════╝ ')}`);
                this.log(`${chalk.blue('██████╔╝██║██║  ███╗██████╔╝██║   ██║██║  ███╗')}`);
                this.log(`${chalk.blue('██╔══██╗██║██║   ██║██╔══██╗██║   ██║██║   ██║')}`);
                this.log(`${chalk.blue('██████╔╝██║╚██████╔╝██████╔╝╚██████╔╝╚██████╔╝')}`);
                this.log(`${chalk.blue('╚═════╝ ╚═╝ ╚═════╝ ╚═════╝  ╚═════╝  ╚═════╝ ')}`);
                this.log(chalk.white(`Running ${chalk.bold.blue('JHipster Audit Helper')} Generator! ${chalk.yellow(`v${packagejs.version}\n`)}`));
            },
            checkServerFramework() {
                if (this.jhipsterAppConfig.skipServer) {
                    this.env.error(`${chalk.red.bold('ERROR!')} This module works only for server...`);
                }
            },
            checkJHVersion() {
                const currentJhipsterVersion = this.config.jhipsterVersion;
                const minimumJhipsterVersion =
                    packagejs.dependencies['generator-jhipster'];
                if (
                    !semver.satisfies(
                        currentJhipsterVersion,
                        minimumJhipsterVersion
                    )
                ) {
                    this.warning(`\nYour generated project used an old JHipster version (${currentJhipsterVersion})... you need at least (${minimumJhipsterVersion})\n`);
                }
            },

            checkDBType() {
                if (this.jhipsterAppConfig.databaseType !== 'sql') {
                    this.env.error(`${chalk.red.bold('ERROR!')} I support only SQL databases...\n`);
                }
            },

            getEntitityNames() {
                const existingEntities = [];
                const existingEntityChoices = [];
                let existingEntityNames = [];
                try {
                    existingEntityNames = fs.readdirSync('.jhipster');
                } catch (e) {
                    this.log(`${chalk.red.bold('ERROR!')} Could not read entities, you might not have generated any entities yet. I will continue to install audit files, entities will not be updated...\n`);
                }

                existingEntityNames.forEach((entry) => {
                    if (entry.indexOf('.json') !== -1) {
                        const entityName = entry.replace('.json', '');
                        existingEntities.push(entityName);
                        existingEntityChoices.push({
                            name: entityName,
                            value: entityName,
                        });
                    }
                });
                this.existingEntities = existingEntities;
                this.existingEntityChoices = existingEntityChoices;
            },
        };
    }

    prompting() {
        const done = this.async();
        const prompts = [
            {
                type: 'list',
                name: 'updateType',
                message:
                    'Do you want to enable audit for all existing entities?',
                choices: [
                    {
                        name: 'Yes, update all',
                        value: 'all',
                    },
                    {
                        name: 'No, let me choose the entities to update',
                        value: 'selected',
                    },
                ],
                default: 'all',
            },
            {
                when: response => response.updateType !== 'all',
                type: 'checkbox',
                name: 'auditedEntities',
                message: 'Please choose the entities to be audited',
                choices: this.existingEntityChoices,
                default: 'none',
            },
        ];
        this.prompt(prompts).then((props) => {
            this.props = props;
            this.updateType = props.updateType;
            this.auditPage = props.auditPage;
            this.auditedEntities = props.auditedEntities;
            done();
        });
    }

    get writing() {
        return {
            setupGlobalVar() {
                // read config from .yo-rc.json
                this.baseName = this.jhipsterAppConfig.baseName;
                this.packageName = this.jhipsterAppConfig.packageName;
                this.buildTool = this.jhipsterAppConfig.buildTool;
                this.databaseType = this.jhipsterAppConfig.databaseType;
                this.devDatabaseType = this.jhipsterAppConfig.devDatabaseType;
                this.prodDatabaseType = this.jhipsterAppConfig.prodDatabaseType;
                this.enableTranslation = this.jhipsterAppConfig.enableTranslation;
                this.languages = this.jhipsterAppConfig.languages;
                this.clientFramework = this.jhipsterAppConfig.clientFramework;
                this.hibernateCache = this.jhipsterAppConfig.hibernateCache;
                this.packageFolder = this.jhipsterAppConfig.packageFolder;
                this.clientPackageManager = this.jhipsterAppConfig.clientPackageManager;
                this.buildTool = this.jhipsterAppConfig.buildTool;
                this.cacheProvider = this.jhipsterAppConfig.cacheProvider;
                this.changelogDate = this.dateFormatForLiquibase();
                this.jhiPrefix = this.jhipsterAppConfig.jhiPrefix;
                // if changelogDate for entity audit already exists then use this existing changelogDate
                const liguibaseFileName = glob.sync(`${
                    this.jhipsterAppConfig.resourceDir
                }/config/liquibase/changelog/*_added_entity_EntityAuditEvent.xml`)[0];
                if (liguibaseFileName) {
                    this.changelogDate = new RegExp('/config/liquibase/changelog/(.*)_added_entity_EntityAuditEvent.xml').exec(liguibaseFileName)[1];
                }

                // use constants from generator-constants.js
                this.javaTemplateDir = 'src/main/java/package';
                this.javaDir = `${jhipsterConstants.SERVER_MAIN_SRC_DIR +
                    this.packageFolder}/`;
                this.resourceDir = jhipsterConstants.SERVER_MAIN_RES_DIR;
                this.interpolateRegex = jhipsterConstants.INTERPOLATE_REGEX;
            },

            writeBaseFiles() {
                const files = [
                    {
                        from: `${
                            this.javaTemplateDir
                        }/web/rest/_EntityAuditResource.java.ejs`,
                        to: `${this.javaDir}web/rest/EntityAuditResource.java`,
                    },
                    {
                        from: `${
                            this.javaTemplateDir
                        }/config/audit/_AsyncEntityAuditEventWriter.java.ejs`,
                        to: `${
                            this.javaDir
                        }config/audit/AsyncEntityAuditEventWriter.java`,
                    },
                    {
                        from: `${
                            this.javaTemplateDir
                        }/config/audit/_EntityAuditEventListener.java.ejs`,
                        to: `${
                            this.javaDir
                        }config/audit/EntityAuditEventListener.java`,
                    },
                    {
                        from: `${
                            this.javaTemplateDir
                        }/config/audit/_EntityAuditAction.java.ejs`,
                        to: `${
                            this.javaDir
                        }config/audit/EntityAuditAction.java`,
                    },
                    {
                        from: `${
                            this.javaTemplateDir
                        }/config/audit/_EntityAuditEventConfig.java.ejs`,
                        to: `${
                            this.javaDir
                        }config/audit/EntityAuditEventConfig.java`,
                    },
                    {
                        from: `${
                            this.javaTemplateDir
                        }/domain/_EntityAuditEvent.java.ejs`,
                        to: `${this.javaDir}domain/EntityAuditEvent.java`,
                    },
                    {
                        from: `${
                            this.javaTemplateDir
                        }/repository/_EntityAuditEventRepository.java.ejs`,
                        to: `${
                            this.javaDir
                        }repository/EntityAuditEventRepository.java`,
                    },
                    {
                        from: `${
                            this.javaTemplateDir
                        }/service/dto/_AbstractAuditingDTO.java.ejs`,
                        to: `${
                            this.javaDir
                        }service/dto/AbstractAuditingDTO.java`,
                    },
                    {
                        from: `${
                            this.resourceDir
                        }/config/liquibase/changelog/_EntityAuditEvent.xml.ejs`,
                        to: `${this.resourceDir}config/liquibase/changelog/${
                            this.changelogDate
                        }_added_entity_EntityAuditEvent.xml`,
                        interpolate: this.interpolateRegex,
                    },
                ];
                genUtils.copyFiles(this, files);
                this.addChangelogToLiquibase(`${this.changelogDate}_added_entity_EntityAuditEvent`);

                // add the new Listener to the 'AbstractAuditingEntity' class and add import
                if (
                    !this.fs
                        .read(
                            `${this.javaDir}domain/AbstractAuditingEntity.java`,
                            {
                                defaults: '',
                            }
                        )
                        .includes('EntityAuditEventListener.class')
                ) {
                    this.replaceContent(
                        `${this.javaDir}domain/AbstractAuditingEntity.java`,
                        'AuditingEntityListener.class',
                        '{AuditingEntityListener.class, EntityAuditEventListener.class}'
                    );
                    this.rewriteFile(
                        `${this.javaDir}domain/AbstractAuditingEntity.java`,
                        'import org.springframework.data.jpa.domain.support.AuditingEntityListener',
                        `import ${
                            this.packageName
                        }.config.audit.EntityAuditEventListener;`
                    );
                }
                // remove the jsonIgnore on the audit fields so that the values can be passed
                // eslint-disable-next-line no-useless-escape
                this.replaceContent(
                    `${this.javaDir}domain/AbstractAuditingEntity.java`,
                    's*@JsonIgnore',
                    '',
                    true
                );

                this.addEntryToCache(
                    `${
                        this.packageName
                    }.domain.EntityAuditEvent.class.getName()`,
                    this.packageFolder,
                    this.cacheProvider
                );
            },

            updateEntityFiles() {
                // Update existing entities to enable audit
                if (this.updateType === 'all') {
                    this.auditedEntities = this.existingEntities;
                }
                if (
                    this.auditedEntities &&
                    this.auditedEntities.length > 0 &&
                    this.auditedEntities !== 'none'
                ) {
                    this.log(`\n${chalk.bold.green('I\'m updating selected entities ')}${chalk.bold.yellow(this.auditedEntities)}`);
                    this.log(`\n${chalk.bold.yellow('Make sure these classes does not extend any other class to avoid any errors during compilation.')}`);
                    let jsonObj = null;

                    this.auditedEntities.forEach((entityName) => {
                        const entityFile = `.jhipster/${entityName}.json`;
                        jsonObj = this.fs.readJSON(entityFile);

                        // flag this entity as audited so the :entity subgenerator
                        // can pick up all audited entities
                        // technically this is only needed for Javers, as the custom
                        // framework obtains this list at runtime using
                        // `EntityAuditEventRepository.findAllEntityTypes`;
                        this.updateEntityConfig(
                            entityFile,
                            'enableEntityAudit',
                            true
                        );

                        genUtils.updateEntityAudit.call(
                            this,
                            entityName,
                            jsonObj,
                            this.javaDir,
                            this.resourceDir
                        );
                    });
                }
            },

            registering() {
                try {
                    this.registerModule(
                        'generator-jhipster-audit-helper',
                        'entity',
                        'post',
                        'entity',
                        'Add support for entity audit'
                    );
                } catch (err) {
                    this.log(`${chalk.red.bold('WARN!')} Could not register as a jhipster post entity creation hook...\n`);
                }
            },
        };
    }

    end() {
        this.log(`\n${chalk.bold.green('Auditing enabled for entities, you will have an option to enable audit while creating new entities as well')}`);
    }
};
