<?php

namespace App\Entity;

use App\Repository\InvestmentRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Validator\Constraints as Assert;

#[ORM\Entity(repositoryClass: InvestmentRepository::class)]
#[ORM\Table(name: 'investments')]
#[ORM\HasLifecycleCallbacks]
class Investment
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: 'integer', options: ['unsigned' => true])]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: Company::class, inversedBy: 'investments')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private ?Company $company = null;

    #[ORM\Column(type: 'string', length: 255, options: ['default' => 'Immobilisation'])]
    #[Assert\NotBlank]
    private string $name = 'Immobilisation';

    // Catégorie (ex. terrain, matériel, bâtiment...)
    #[ORM\Column(type: 'string', length: 255, nullable: true)]
    private ?string $category = null;

    // Type d'équipement — informatif (électrique / non électrique)
    #[ORM\Column(type: 'string', length: 20, nullable: true)]
    #[Assert\Choice(choices: ['electrique', 'non_electrique'])]
    private ?string $equipmentType = null;

    // Valeur brute de l'immobilisation (en Ariary)
    #[ORM\Column(type: 'bigint', options: ['default' => 0])]
    private int $amount = 0;

    // Durée d'amortissement linéaire (en années)
    #[ORM\Column(type: 'smallint', options: ['default' => 5])]
    #[Assert\GreaterThan(0)]
    private int $usefulLife = 5;

    // Financement de l'investissement
    #[ORM\Column(type: 'bigint', options: ['default' => 0])]
    private int $financedEquity = 0;

    // Nature de l'apport en fonds propres :
    // 'nature'    = apport en nature (bien déjà possédé) → toujours 100% de financedEquity, pas de subvention/emprunt
    // 'financier' = apport en espèces → pourcentage libre de 0 à 99%, le reste financé par subvention/emprunt
    #[ORM\Column(type: 'string', length: 20, options: ['default' => 'financier'])]
    #[Assert\Choice(choices: ['nature', 'financier'])]
    private string $contributionType = 'financier';

    #[ORM\Column(type: 'bigint', options: ['default' => 0])]
    private int $financedLoan = 0;

    #[ORM\Column(type: 'bigint', options: ['default' => 0])]
    private int $financedGrant = 0;

    // Paramètres de l'emprunt
    #[ORM\Column(type: 'decimal', precision: 6, scale: 2, options: ['default' => 0])]
    private float $loanRate = 0;

    #[ORM\Column(type: 'smallint', options: ['default' => 5])]
    private int $loanYears = 5;

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

    public function getCategory(): ?string { return $this->category; }
    public function setCategory(?string $category): static { $this->category = $category; return $this; }

    public function getAmount(): int { return (int) $this->amount; }
    public function setAmount(int $amount): static { $this->amount = $amount; return $this; }

    public function getUsefulLife(): int { return $this->usefulLife; }
    public function setUsefulLife(int $usefulLife): static { $this->usefulLife = max(1, $usefulLife); return $this; }

    public function getEquipmentType(): ?string { return $this->equipmentType; }
    public function setEquipmentType(?string $equipmentType): static { $this->equipmentType = $equipmentType; return $this; }

    public function getFinancedEquity(): int { return (int) $this->financedEquity; }
    public function setFinancedEquity(int $financedEquity): static { $this->financedEquity = $financedEquity; return $this; }

    public function getContributionType(): string { return $this->contributionType; }
    public function setContributionType(string $contributionType): static { $this->contributionType = $contributionType; return $this; }

    public function getFinancedLoan(): int { return (int) $this->financedLoan; }
    public function setFinancedLoan(int $financedLoan): static { $this->financedLoan = $financedLoan; return $this; }

    public function getFinancedGrant(): int { return (int) $this->financedGrant; }
    public function setFinancedGrant(int $financedGrant): static { $this->financedGrant = $financedGrant; return $this; }

    public function getLoanRate(): float { return (float) $this->loanRate; }
    public function setLoanRate(float $loanRate): static { $this->loanRate = $loanRate; return $this; }

    public function getLoanYears(): int { return $this->loanYears; }
    public function setLoanYears(int $loanYears): static { $this->loanYears = max(1, $loanYears); return $this; }

    public function getSortOrder(): int { return $this->sortOrder; }
    public function setSortOrder(int $sortOrder): static { $this->sortOrder = $sortOrder; return $this; }

    public function getCreatedAt(): \DateTimeImmutable { return $this->createdAt; }
    public function getUpdatedAt(): \DateTimeImmutable { return $this->updatedAt; }

    /** Amortissement annuel (méthode linéaire) */
    public function getAnnualDepreciation(): float
    {
        return $this->usefulLife > 0 ? $this->amount / $this->usefulLife : 0;
    }
}
