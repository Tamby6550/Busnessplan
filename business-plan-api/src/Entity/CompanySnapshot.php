<?php

namespace App\Entity;

use App\Repository\CompanySnapshotRepository;
use Doctrine\ORM\Mapping as ORM;

/**
 * Snapshot des KPI calculés de l'entreprise.
 * Mis à jour automatiquement après chaque modification significative.
 * Utilisé par le dashboard pour afficher les infos sans recalcul complet.
 */
#[ORM\Entity(repositoryClass: CompanySnapshotRepository::class)]
#[ORM\Table(name: 'company_snapshots')]
#[ORM\HasLifecycleCallbacks]
class CompanySnapshot
{
    #[ORM\Id]
    #[ORM\OneToOne(inversedBy: 'snapshot', targetEntity: Company::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private ?Company $company = null;

    // Chiffre d'affaires An 1 (Ariary)
    #[ORM\Column(type: 'bigint', options: ['default' => 0])]
    private int $revenueY1 = 0;

    // Résultat net An 1 (Ariary) — peut être négatif
    #[ORM\Column(type: 'bigint', options: ['default' => 0])]
    private int $netIncomeY1 = 0;

    // Trésorerie cumulée An 1 (Ariary)
    #[ORM\Column(type: 'bigint', options: ['default' => 0])]
    private int $cashCumY1 = 0;

    // Seuil de rentabilité (Ariary)
    #[ORM\Column(type: 'bigint', options: ['default' => 0])]
    private int $breakEven = 0;

    // Pourcentage de complétion des informations (0-100)
    #[ORM\Column(type: 'smallint', options: ['default' => 0])]
    private int $completionPct = 0;

    #[ORM\Column(type: 'datetime_immutable')]
    private \DateTimeImmutable $updatedAt;

    public function __construct()
    {
        $this->updatedAt = new \DateTimeImmutable();
    }

    #[ORM\PreUpdate]
    public function onPreUpdate(): void
    {
        $this->updatedAt = new \DateTimeImmutable();
    }

    // ──────────── Getters / Setters ────────────

    public function getCompany(): ?Company { return $this->company; }
    public function setCompany(?Company $company): static { $this->company = $company; return $this; }

    public function getRevenueY1(): int { return (int) $this->revenueY1; }
    public function setRevenueY1(int $revenueY1): static { $this->revenueY1 = $revenueY1; return $this; }

    public function getNetIncomeY1(): int { return (int) $this->netIncomeY1; }
    public function setNetIncomeY1(int $netIncomeY1): static { $this->netIncomeY1 = $netIncomeY1; return $this; }

    public function getCashCumY1(): int { return (int) $this->cashCumY1; }
    public function setCashCumY1(int $cashCumY1): static { $this->cashCumY1 = $cashCumY1; return $this; }

    public function getBreakEven(): int { return (int) $this->breakEven; }
    public function setBreakEven(int $breakEven): static { $this->breakEven = $breakEven; return $this; }

    public function getCompletionPct(): int { return $this->completionPct; }
    public function setCompletionPct(int $completionPct): static { $this->completionPct = min(100, max(0, $completionPct)); return $this; }

    public function getUpdatedAt(): \DateTimeImmutable { return $this->updatedAt; }
}
