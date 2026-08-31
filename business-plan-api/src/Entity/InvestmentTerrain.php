<?php

namespace App\Entity;

use App\Repository\InvestmentTerrainRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Validator\Constraints as Assert;

/**
 * Investissement Terrain — table séparée de l'investissement général.
 * Un terrain n'a pas de durée d'amortissement : il n'est jamais amorti
 * (aucune durée, aucun lien avec le tableau des amortissements).
 * Pas de plan de financement non plus (fonds propres / subvention / emprunt) :
 * ça n'a aucun lien avec la trésorerie, uniquement désignation + montant.
 */
#[ORM\Entity(repositoryClass: InvestmentTerrainRepository::class)]
#[ORM\Table(name: 'investment_terrains')]
#[ORM\HasLifecycleCallbacks]
class InvestmentTerrain
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: 'integer', options: ['unsigned' => true])]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: Company::class, inversedBy: 'investmentTerrains')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private ?Company $company = null;

    #[ORM\Column(type: 'string', length: 255, options: ['default' => 'Terrain'])]
    #[Assert\NotBlank]
    private string $name = 'Terrain';

    // Valeur du terrain (en Ariary) — pas d'amortissement, pas de financement
    #[ORM\Column(type: 'bigint', options: ['default' => 0])]
    private int $amount = 0;

    // Nature de l'investissement : immatériel (brevet, fonds de commerce...) ou physique (terrain, bâtiment...)
    #[ORM\Column(type: 'string', length: 20, options: ['default' => 'physique'])]
    #[Assert\Choice(choices: ['immateriel', 'physique'])]
    private string $natureType = 'physique';

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

    public function getAmount(): int { return (int) $this->amount; }
    public function setAmount(int $amount): static { $this->amount = $amount; return $this; }

    public function getNatureType(): string { return $this->natureType; }
    public function setNatureType(string $natureType): static { $this->natureType = $natureType; return $this; }

    public function getSortOrder(): int { return $this->sortOrder; }
    public function setSortOrder(int $sortOrder): static { $this->sortOrder = $sortOrder; return $this; }

    public function getCreatedAt(): \DateTimeImmutable { return $this->createdAt; }
    public function getUpdatedAt(): \DateTimeImmutable { return $this->updatedAt; }
}
