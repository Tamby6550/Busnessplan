<?php

namespace App\Entity;

use App\Repository\AdditionalFundingRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Validator\Constraints as Assert;

#[ORM\Entity(repositoryClass: AdditionalFundingRepository::class)]
#[ORM\Table(name: 'additional_fundings')]
#[ORM\UniqueConstraint(name: 'uk_company_year', columns: ['company_id', 'year_number'])]
class AdditionalFunding
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: 'integer', options: ['unsigned' => true])]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: Company::class, inversedBy: 'additionalFundings')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private ?Company $company = null;

    // Numéro d'année : 1 à 5
    #[ORM\Column(type: 'smallint')]
    #[Assert\Range(min: 1, max: 5)]
    private int $yearNumber = 1;

    // Apport en fonds propres (en Ariary)
    #[ORM\Column(type: 'bigint', options: ['default' => 0])]
    private int $equity = 0;

    // Emprunt complémentaire (en Ariary)
    #[ORM\Column(type: 'bigint', options: ['default' => 0])]
    private int $loan = 0;

    // Taux d'intérêt de l'emprunt complémentaire (%)
    #[ORM\Column(type: 'decimal', precision: 6, scale: 2, options: ['default' => 0])]
    private float $loanRate = 0;

    // Durée de remboursement (années)
    #[ORM\Column(type: 'smallint', options: ['default' => 1])]
    private int $loanYears = 1;

    // Subvention complémentaire (en Ariary) — colonne nommée 'subvention' (grant est réservé MySQL)
    #[ORM\Column(name: 'subvention', type: 'bigint', options: ['default' => 0])]
    private int $grant = 0;

    // ──────────── Getters / Setters ────────────

    public function getId(): ?int { return $this->id; }

    public function getCompany(): ?Company { return $this->company; }
    public function setCompany(?Company $company): static { $this->company = $company; return $this; }

    public function getYearNumber(): int { return $this->yearNumber; }
    public function setYearNumber(int $yearNumber): static { $this->yearNumber = $yearNumber; return $this; }

    public function getEquity(): int { return (int) $this->equity; }
    public function setEquity(int $equity): static { $this->equity = $equity; return $this; }

    public function getLoan(): int { return (int) $this->loan; }
    public function setLoan(int $loan): static { $this->loan = $loan; return $this; }

    public function getLoanRate(): float { return (float) $this->loanRate; }
    public function setLoanRate(float $loanRate): static { $this->loanRate = $loanRate; return $this; }

    public function getLoanYears(): int { return $this->loanYears; }
    public function setLoanYears(int $loanYears): static { $this->loanYears = max(1, $loanYears); return $this; }

    public function getGrant(): int { return (int) $this->grant; }
    public function setGrant(int $grant): static { $this->grant = $grant; return $this; }

    /** Total de l'apport complémentaire pour cette année */
    public function getTotal(): int
    {
        return $this->equity + $this->loan + $this->grant;
    }
}
