<?php

namespace App\Entity;

use App\Repository\CompanySettingsRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: CompanySettingsRepository::class)]
#[ORM\Table(name: 'company_settings')]
class CompanySettings
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: 'integer', options: ['unsigned' => true])]
    private ?int $id = null;

    #[ORM\OneToOne(inversedBy: 'settings', targetEntity: Company::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private ?Company $company = null;

    // Taux d'inflation annuels An 2 à An 5 (%)
    #[ORM\Column(type: 'decimal', precision: 6, scale: 2, options: ['default' => 0])]
    private float $infl2 = 0;

    #[ORM\Column(type: 'decimal', precision: 6, scale: 2, options: ['default' => 0])]
    private float $infl3 = 0;

    #[ORM\Column(type: 'decimal', precision: 6, scale: 2, options: ['default' => 0])]
    private float $infl4 = 0;

    #[ORM\Column(type: 'decimal', precision: 6, scale: 2, options: ['default' => 0])]
    private float $infl5 = 0;

    // Taux d'actualisation pour la VAN (%)
    #[ORM\Column(type: 'decimal', precision: 6, scale: 2, options: ['default' => 10])]
    private float $discountRate = 10;

    // Régime d'imposition : 'IR' (Impôt sur le Revenu) ou 'IS' (Impôt Synthétique)
    #[ORM\Column(type: 'string', length: 2, options: ['default' => 'IR'])]
    private string $taxRegime = 'IR';

    // Taux IR — % appliqué au résultat avant impôt (EBT)
    #[ORM\Column(type: 'decimal', precision: 6, scale: 2, options: ['default' => 20])]
    private float $taxRate = 20;

    // Taux IS — % appliqué au chiffre d'affaires
    #[ORM\Column(type: 'decimal', precision: 6, scale: 2, options: ['default' => 5])]
    private float $taxRateIs = 5;

    // Fonds de roulement initial (en Ariary)
    #[ORM\Column(type: 'bigint', options: ['default' => 0])]
    private int $fondsRoulement = 0;

    // ──────────── Getters / Setters ────────────

    public function getId(): ?int { return $this->id; }

    public function getCompany(): ?Company { return $this->company; }
    public function setCompany(?Company $company): static { $this->company = $company; return $this; }

    public function getInfl2(): float { return (float) $this->infl2; }
    public function setInfl2(float $infl2): static { $this->infl2 = $infl2; return $this; }

    public function getInfl3(): float { return (float) $this->infl3; }
    public function setInfl3(float $infl3): static { $this->infl3 = $infl3; return $this; }

    public function getInfl4(): float { return (float) $this->infl4; }
    public function setInfl4(float $infl4): static { $this->infl4 = $infl4; return $this; }

    public function getInfl5(): float { return (float) $this->infl5; }
    public function setInfl5(float $infl5): static { $this->infl5 = $infl5; return $this; }

    public function getDiscountRate(): float { return (float) $this->discountRate; }
    public function setDiscountRate(float $discountRate): static { $this->discountRate = $discountRate; return $this; }

    public function getTaxRegime(): string { return $this->taxRegime; }
    public function setTaxRegime(string $taxRegime): static { $this->taxRegime = $taxRegime; return $this; }

    public function getTaxRate(): float { return (float) $this->taxRate; }
    public function setTaxRate(float $taxRate): static { $this->taxRate = $taxRate; return $this; }

    public function getTaxRateIs(): float { return (float) $this->taxRateIs; }
    public function setTaxRateIs(float $taxRateIs): static { $this->taxRateIs = $taxRateIs; return $this; }

    public function getFondsRoulement(): int { return (int) $this->fondsRoulement; }
    public function setFondsRoulement(int $fondsRoulement): static { $this->fondsRoulement = $fondsRoulement; return $this; }
}
