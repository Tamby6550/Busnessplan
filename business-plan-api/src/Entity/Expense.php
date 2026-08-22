<?php

namespace App\Entity;

use App\Repository\ExpenseRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Validator\Constraints as Assert;

#[ORM\Entity(repositoryClass: ExpenseRepository::class)]
#[ORM\Table(name: 'expenses')]
#[ORM\HasLifecycleCallbacks]
class Expense
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: 'integer', options: ['unsigned' => true])]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: Company::class, inversedBy: 'expenses')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private ?Company $company = null;

    #[ORM\Column(type: 'string', length: 255, options: ['default' => 'Charge'])]
    #[Assert\NotBlank]
    private string $name = 'Charge';

    // Montant unitaire en Ariary — mois 1 (Janvier). Historique : seul montant avant
    // l'introduction du montant mensuel ; conservé tel quel pour ne pas perdre les données
    // déjà saisies.
    #[ORM\Column(type: 'bigint', options: ['default' => 0])]
    private int $monthlyAmount = 0;

    // Montant des mois 2 à 12 (Février à Décembre) — permet une variation selon le mois.
    // Colonnes séparées (pas de JSON), exposées ensemble via getMonthlyAmounts()/setMonthlyAmounts().
    #[ORM\Column(type: 'bigint', options: ['default' => 0])]
    private int $monthlyAmountM2 = 0;
    #[ORM\Column(type: 'bigint', options: ['default' => 0])]
    private int $monthlyAmountM3 = 0;
    #[ORM\Column(type: 'bigint', options: ['default' => 0])]
    private int $monthlyAmountM4 = 0;
    #[ORM\Column(type: 'bigint', options: ['default' => 0])]
    private int $monthlyAmountM5 = 0;
    #[ORM\Column(type: 'bigint', options: ['default' => 0])]
    private int $monthlyAmountM6 = 0;
    #[ORM\Column(type: 'bigint', options: ['default' => 0])]
    private int $monthlyAmountM7 = 0;
    #[ORM\Column(type: 'bigint', options: ['default' => 0])]
    private int $monthlyAmountM8 = 0;
    #[ORM\Column(type: 'bigint', options: ['default' => 0])]
    private int $monthlyAmountM9 = 0;
    #[ORM\Column(type: 'bigint', options: ['default' => 0])]
    private int $monthlyAmountM10 = 0;
    #[ORM\Column(type: 'bigint', options: ['default' => 0])]
    private int $monthlyAmountM11 = 0;
    #[ORM\Column(type: 'bigint', options: ['default' => 0])]
    private int $monthlyAmountM12 = 0;

    // Coefficients de saisonnalité — JSON [1,1,...,1] × 12
    // Valeur 1 = présent, 0 = absent, valeur décimale possible
    #[ORM\Column(type: 'json')]
    private array $seasonality = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1];

    // Taux de croissance annuels An 1-5 (peut différer de l'inflation globale)
    #[ORM\Column(type: 'json')]
    private array $inflationGrowth = [0, 0, 0, 0, 0];

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

    public function getMonthlyAmount(): int { return (int) $this->monthlyAmount; }
    public function setMonthlyAmount(int $monthlyAmount): static { $this->monthlyAmount = $monthlyAmount; return $this; }

    /** Montant des 12 mois, dans l'ordre [Janvier..Décembre]. */
    public function getMonthlyAmounts(): array
    {
        return [
            $this->monthlyAmount, $this->monthlyAmountM2, $this->monthlyAmountM3, $this->monthlyAmountM4,
            $this->monthlyAmountM5, $this->monthlyAmountM6, $this->monthlyAmountM7, $this->monthlyAmountM8,
            $this->monthlyAmountM9, $this->monthlyAmountM10, $this->monthlyAmountM11, $this->monthlyAmountM12,
        ];
    }

    /** Définit les 12 mois d'un coup (tableau [Janvier..Décembre]) ; complète avec 0 si incomplet. */
    public function setMonthlyAmounts(array $values): static
    {
        $v = array_pad(array_slice(array_map('intval', array_values($values)), 0, 12), 12, 0);
        [
            $this->monthlyAmount, $this->monthlyAmountM2, $this->monthlyAmountM3, $this->monthlyAmountM4,
            $this->monthlyAmountM5, $this->monthlyAmountM6, $this->monthlyAmountM7, $this->monthlyAmountM8,
            $this->monthlyAmountM9, $this->monthlyAmountM10, $this->monthlyAmountM11, $this->monthlyAmountM12,
        ] = $v;
        return $this;
    }

    public function getSeasonality(): array { return $this->seasonality; }
    public function setSeasonality(array $seasonality): static { $this->seasonality = $seasonality; return $this; }

    public function getInflationGrowth(): array { return $this->inflationGrowth; }
    public function setInflationGrowth(array $inflationGrowth): static { $this->inflationGrowth = $inflationGrowth; return $this; }

    public function getSortOrder(): int { return $this->sortOrder; }
    public function setSortOrder(int $sortOrder): static { $this->sortOrder = $sortOrder; return $this; }

    public function getCreatedAt(): \DateTimeImmutable { return $this->createdAt; }
    public function getUpdatedAt(): \DateTimeImmutable { return $this->updatedAt; }

    /** Total annuel An 1 = somme, mois par mois, de (montant du mois × quantité/coefficient du mois) */
    public function getAnnualTotal(): float
    {
        $amounts = $this->getMonthlyAmounts();
        $total = 0;
        foreach ($this->seasonality as $m => $coef) {
            $total += $coef * ($amounts[$m] ?? 0);
        }
        return $total;
    }
}
