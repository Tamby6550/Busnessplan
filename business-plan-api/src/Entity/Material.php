<?php

namespace App\Entity;

use App\Repository\MaterialRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Validator\Constraints as Assert;

#[ORM\Entity(repositoryClass: MaterialRepository::class)]
#[ORM\Table(name: 'materials')]
#[ORM\HasLifecycleCallbacks]
class Material
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: 'integer', options: ['unsigned' => true])]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: Company::class, inversedBy: 'materials')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private ?Company $company = null;

    #[ORM\Column(type: 'string', length: 255, options: ['default' => 'Matière'])]
    #[Assert\NotBlank]
    private string $name = 'Matière';

    // Coût unitaire en Ariary — mois 1 (Janvier). Historique : seul coût avant l'introduction
    // du coût mensuel ; conservé tel quel pour ne pas perdre les données déjà saisies.
    #[ORM\Column(type: 'bigint', options: ['default' => 0])]
    private int $unitCost = 0;

    // Coût unitaire des mois 2 à 12 (Février à Décembre) — permet une variation saisonnière.
    // Colonnes séparées (pas de JSON), exposées ensemble via getMonthlyUnitCosts()/setMonthlyUnitCosts().
    #[ORM\Column(type: 'bigint', options: ['default' => 0])]
    private int $unitCostM2 = 0;
    #[ORM\Column(type: 'bigint', options: ['default' => 0])]
    private int $unitCostM3 = 0;
    #[ORM\Column(type: 'bigint', options: ['default' => 0])]
    private int $unitCostM4 = 0;
    #[ORM\Column(type: 'bigint', options: ['default' => 0])]
    private int $unitCostM5 = 0;
    #[ORM\Column(type: 'bigint', options: ['default' => 0])]
    private int $unitCostM6 = 0;
    #[ORM\Column(type: 'bigint', options: ['default' => 0])]
    private int $unitCostM7 = 0;
    #[ORM\Column(type: 'bigint', options: ['default' => 0])]
    private int $unitCostM8 = 0;
    #[ORM\Column(type: 'bigint', options: ['default' => 0])]
    private int $unitCostM9 = 0;
    #[ORM\Column(type: 'bigint', options: ['default' => 0])]
    private int $unitCostM10 = 0;
    #[ORM\Column(type: 'bigint', options: ['default' => 0])]
    private int $unitCostM11 = 0;
    #[ORM\Column(type: 'bigint', options: ['default' => 0])]
    private int $unitCostM12 = 0;

    // Quantités mensuelles An 1 — JSON [Jan..Déc]
    #[ORM\Column(type: 'json')]
    private array $monthlyQty = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

    // Taux de croissance des quantités An 2-5 — JSON [0, cr2, cr3, cr4, cr5]
    #[ORM\Column(type: 'json')]
    private array $growthRates = [0, 0, 0, 0, 0];

    #[ORM\Column(type: 'smallint', options: ['default' => 0])]
    private int $sortOrder = 0;

    #[ORM\Column(type: 'datetime_immutable')]
    private \DateTimeImmutable $createdAt;

    #[ORM\Column(type: 'datetime_immutable')]
    private \DateTimeImmutable $updatedAt;

    public function __construct()
    {
        $this->createdAt = new \DateTimeImmutable();
        $this->updatedAt = new \DateTimeImmutable();
    }

    #[ORM\PreUpdate]
    public function onPreUpdate(): void
    {
        $this->updatedAt = new \DateTimeImmutable();
    }

    public function getId(): ?int { return $this->id; }

    public function getCompany(): ?Company { return $this->company; }
    public function setCompany(?Company $company): static { $this->company = $company; return $this; }

    public function getName(): string { return $this->name; }
    public function setName(string $name): static { $this->name = $name; return $this; }

    public function getUnitCost(): int { return (int) $this->unitCost; }
    public function setUnitCost(int $unitCost): static { $this->unitCost = $unitCost; return $this; }

    /** Coût des 12 mois, dans l'ordre [Janvier..Décembre]. */
    public function getMonthlyUnitCosts(): array
    {
        return [
            $this->unitCost, $this->unitCostM2, $this->unitCostM3, $this->unitCostM4,
            $this->unitCostM5, $this->unitCostM6, $this->unitCostM7, $this->unitCostM8,
            $this->unitCostM9, $this->unitCostM10, $this->unitCostM11, $this->unitCostM12,
        ];
    }

    /** Définit les 12 mois d'un coup (tableau [Janvier..Décembre]) ; complète avec 0 si incomplet. */
    public function setMonthlyUnitCosts(array $values): static
    {
        $v = array_pad(array_slice(array_map('intval', array_values($values)), 0, 12), 12, 0);
        [
            $this->unitCost, $this->unitCostM2, $this->unitCostM3, $this->unitCostM4,
            $this->unitCostM5, $this->unitCostM6, $this->unitCostM7, $this->unitCostM8,
            $this->unitCostM9, $this->unitCostM10, $this->unitCostM11, $this->unitCostM12,
        ] = $v;
        return $this;
    }

    public function getMonthlyQty(): array { return $this->monthlyQty; }
    public function setMonthlyQty(array $monthlyQty): static { $this->monthlyQty = $monthlyQty; return $this; }

    public function getGrowthRates(): array { return $this->growthRates; }
    public function setGrowthRates(array $growthRates): static { $this->growthRates = $growthRates; return $this; }

    public function getSortOrder(): int { return $this->sortOrder; }
    public function setSortOrder(int $sortOrder): static { $this->sortOrder = $sortOrder; return $this; }

    public function getCreatedAt(): \DateTimeImmutable { return $this->createdAt; }
    public function getUpdatedAt(): \DateTimeImmutable { return $this->updatedAt; }

    /** Coût total annuel An 1 (coût mensuel × quantité mensuelle, mois par mois ; décimales autorisées sur la quantité) */
    public function getTotalAnnualCost(): int|float
    {
        $costs = $this->getMonthlyUnitCosts();
        $total = 0;
        foreach ($this->monthlyQty as $m => $qty) {
            $total += $qty * ($costs[$m] ?? 0);
        }
        return $total;
    }
}
