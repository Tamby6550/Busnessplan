<?php

namespace App\Entity;

use App\Repository\StaffMemberRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Validator\Constraints as Assert;

#[ORM\Entity(repositoryClass: StaffMemberRepository::class)]
#[ORM\Table(name: 'staff_members')]
#[ORM\HasLifecycleCallbacks]
class StaffMember
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: 'integer', options: ['unsigned' => true])]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: Company::class, inversedBy: 'staffMembers')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private ?Company $company = null;

    #[ORM\Column(type: 'string', length: 255, options: ['default' => 'Poste'])]
    #[Assert\NotBlank]
    private string $roleName = 'Poste';

    // Salaire mensuel brut (en Ariary)
    #[ORM\Column(type: 'bigint', options: ['default' => 0])]
    private int $monthlySalary = 0;

    // Nombre de personnes à ce poste
    #[ORM\Column(type: 'smallint', options: ['default' => 1])]
    #[Assert\GreaterThanOrEqual(1)]
    private int $headcount = 1;

    // Taux de charges sociales (%) — ex. 13 pour 13%
    #[ORM\Column(type: 'decimal', precision: 6, scale: 2, options: ['default' => 13])]
    private float $chargesRate = 13;

    // Taux de croissance annuel par poste An 2-5 (%) — tableau JSON de 4 valeurs
    // Pas de 'default' dans options : MySQL interdit DEFAULT sur les colonnes JSON/BLOB.
    // La valeur par défaut est gérée en PHP via l'initialisation de propriété.
    #[ORM\Column(type: 'json')]
    private array $growthRates = [0, 0, 0, 0];

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

    public function getRoleName(): string { return $this->roleName; }
    public function setRoleName(string $roleName): static { $this->roleName = $roleName; return $this; }

    public function getMonthlySalary(): int { return (int) $this->monthlySalary; }
    public function setMonthlySalary(int $monthlySalary): static { $this->monthlySalary = $monthlySalary; return $this; }

    public function getHeadcount(): int { return $this->headcount; }
    public function setHeadcount(int $headcount): static { $this->headcount = max(1, $headcount); return $this; }

    public function getChargesRate(): float { return (float) $this->chargesRate; }
    public function setChargesRate(float $chargesRate): static { $this->chargesRate = $chargesRate; return $this; }

    public function getGrowthRates(): array { return $this->growthRates; }
    public function setGrowthRates(array $growthRates): static { $this->growthRates = array_values(array_slice($growthRates, 0, 4)); return $this; }

    public function getSortOrder(): int { return $this->sortOrder; }
    public function setSortOrder(int $sortOrder): static { $this->sortOrder = $sortOrder; return $this; }

    public function getCreatedAt(): \DateTimeImmutable { return $this->createdAt; }
    public function getUpdatedAt(): \DateTimeImmutable { return $this->updatedAt; }

    /** Coût annuel total = Salaire × Nb personnes × 12 × (1 + Charges%) */
    public function getAnnualCost(): float
    {
        return $this->monthlySalary * $this->headcount * 12 * (1 + $this->chargesRate / 100);
    }
}
