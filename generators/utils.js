const glob = require('glob');

const TPL = 'template';

const changeset = (changelogDate, entityTableName) =>
    `
    <!-- Added the entity audit columns -->
    <changeSet id="${changelogDate}-audit-1" author="jhipster-audit-helper">
        <addColumn tableName="${entityTableName}">
            <column name="created_by" type="varchar(50)">
                <constraints nullable="false"/>
            </column>
            <column name="created_date" type="timestamp" defaultValueDate="\${now}">
                <constraints nullable="false"/>
            </column>
            <column name="last_modified_by" type="varchar(50)"/>
            <column name="last_modified_date" type="timestamp"/>
        </addColumn>
    </changeSet>`;

const copyFiles = (gen, files) => {
    files.forEach((file) => {
        gen.copyTemplate(
            file.from,
            file.to,
            file.type ? file.type : TPL,
            gen,
            file.interpolate
                ? {
                    interpolate: file.interpolate
                }
                : undefined
        );
    });
};

const updateEntityAudit = function (
    entityName,
    entityData,
    javaDir,
    resourceDir,
    updateIndex
) {
    // extend entity with AbstractAuditingEntity
    if (
        !this.fs
            .read(`${javaDir}domain/${entityName}.java`, {
                defaults: ''
            })
            .includes('extends AbstractAuditingEntity')
    ) {
        this.replaceContent(
            `${javaDir}domain/${entityName}.java`,
            `public class ${entityName}`,
            `public class ${entityName} extends AbstractAuditingEntity`
        );
    }
    // extend DTO with AbstractAuditingDTO
    if (entityData.dto === 'mapstruct') {
        if (
            !this.fs
                .read(`${javaDir}service/dto/${entityName}DTO.java`, {
                    defaults: ''
                })
                .includes('extends AbstractAuditingDTO')
        ) {
            this.replaceContent(
                `${javaDir}service/dto/${entityName}DTO.java`,
                `public class ${entityName}DTO`,
                `public class ${entityName}DTO extends AbstractAuditingDTO`
            );
        }
    }

    // update liquibase changeset
    const file = glob.sync(`${resourceDir}/config/liquibase/changelog/*_added_entity_${entityName}.xml`)[0];
    const entityTableName = entityData.entityTableName
        ? entityData.entityTableName
        : entityName;
    this.addChangesetToLiquibaseEntityChangelog(
        file,
        changeset(this.changelogDate, this.getTableName(entityTableName))
    );
};

module.exports = {
    changeset,
    copyFiles,
    updateEntityAudit
};
