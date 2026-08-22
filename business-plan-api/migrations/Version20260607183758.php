<?php

declare(strict_types=1);

namespace App\Migration;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20260607183758 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE additional_fundings CHANGE loan_rate loan_rate NUMERIC(6, 2) DEFAULT \'0\' NOT NULL');
        $this->addSql('ALTER TABLE company_settings CHANGE infl2 infl2 NUMERIC(6, 2) DEFAULT \'0\' NOT NULL, CHANGE infl3 infl3 NUMERIC(6, 2) DEFAULT \'0\' NOT NULL, CHANGE infl4 infl4 NUMERIC(6, 2) DEFAULT \'0\' NOT NULL, CHANGE infl5 infl5 NUMERIC(6, 2) DEFAULT \'0\' NOT NULL, CHANGE discount_rate discount_rate NUMERIC(6, 2) DEFAULT \'10\' NOT NULL, CHANGE tax_rate tax_rate NUMERIC(6, 2) DEFAULT \'20\' NOT NULL, CHANGE tax_rate_is tax_rate_is NUMERIC(6, 2) DEFAULT \'5\' NOT NULL');
        $this->addSql('ALTER TABLE investments CHANGE loan_rate loan_rate NUMERIC(6, 2) DEFAULT \'0\' NOT NULL');
        $this->addSql('ALTER TABLE staff_members CHANGE charges_rate charges_rate NUMERIC(6, 2) DEFAULT \'13\' NOT NULL');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE additional_fundings CHANGE loan_rate loan_rate NUMERIC(6, 2) DEFAULT \'0.00\' NOT NULL');
        $this->addSql('ALTER TABLE company_settings CHANGE infl2 infl2 NUMERIC(6, 2) DEFAULT \'0.00\' NOT NULL, CHANGE infl3 infl3 NUMERIC(6, 2) DEFAULT \'0.00\' NOT NULL, CHANGE infl4 infl4 NUMERIC(6, 2) DEFAULT \'0.00\' NOT NULL, CHANGE infl5 infl5 NUMERIC(6, 2) DEFAULT \'0.00\' NOT NULL, CHANGE discount_rate discount_rate NUMERIC(6, 2) DEFAULT \'10.00\' NOT NULL, CHANGE tax_rate tax_rate NUMERIC(6, 2) DEFAULT \'20.00\' NOT NULL, CHANGE tax_rate_is tax_rate_is NUMERIC(6, 2) DEFAULT \'5.00\' NOT NULL');
        $this->addSql('ALTER TABLE investments CHANGE loan_rate loan_rate NUMERIC(6, 2) DEFAULT \'0.00\' NOT NULL');
        $this->addSql('ALTER TABLE staff_members CHANGE charges_rate charges_rate NUMERIC(6, 2) DEFAULT \'13.00\' NOT NULL');
    }
}
