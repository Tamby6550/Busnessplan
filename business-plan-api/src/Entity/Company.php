<?php

namespace App\Entity;

use App\Repository\CompanyRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Validator\Constraints as Assert;

#[ORM\Entity(repositoryClass: CompanyRepository::class)]
#[ORM\Table(name: 'companies')]
#[ORM\HasLifecycleCallbacks]
class Company
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: 'integer', options: ['unsigned' => true])]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: Project::class, inversedBy: 'companies')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private ?Project $project = null;

    #[ORM\Column(type: 'string', length: 255)]
    #[Assert\NotBlank(message: "Le nom de l'entreprise est obligatoire.")]
    private string $name = '';

    #[ORM\Column(type: 'string', length: 255, nullable: true)]
    private ?string $secteur = null;

    #[ORM\Column(type: 'string', length: 255, nullable: true)]
    private ?string $promoteur = null;

    #[ORM\Column(type: 'text', nullable: true)]
    private ?string $descriptionActivite = null;

    #[ORM\Column(type: 'text', nullable: true)]
    private ?string $marche = null;

    #[ORM\Column(type: 'string', length: 10, nullable: true)]
    private ?string $genre = null; // 'femme' | 'homme'

    #[ORM\Column(type: 'simple_array', length: 50, nullable: true)]
    private ?array $modeleEconomique = null; // sous-ensemble de ['production', 'service'] — choix multiple

    #[ORM\Column(type: 'string', length: 20, nullable: true)]
    private ?string $etatActivite = null; // 'existante' | 'nouvelle'

    #[ORM\Column(type: 'string', length: 10, options: ['default' => 'Ar'])]
    private string $devise = 'Ar';

    #[ORM\ManyToOne(targetEntity: User::class, inversedBy: 'companies')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'RESTRICT')]
    private ?User $createdBy = null;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?User $lastModifiedBy = null;

    #[ORM\Column(type: 'datetime_immutable')]
    private \DateTimeImmutable $createdAt;

    #[ORM\Column(type: 'datetime_immutable')]
    private \DateTimeImmutable $updatedAt;

    // ──────────── Validation ────────────

    #[ORM\Column(type: 'boolean', options: ['default' => false])]
    private bool $isValidated = false;

    #[ORM\Column(type: 'datetime_immutable', nullable: true)]
    private ?\DateTimeImmutable $validatedAt = null;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?User $validatedBy = null;

    // ──────────── Relations enfants ────────────

    #[ORM\OneToOne(
        mappedBy: 'company',
        targetEntity: CompanySettings::class,
        cascade: ['persist', 'remove'],
        orphanRemoval: true
    )]
    private ?CompanySettings $settings = null;

    #[ORM\OneToOne(
        mappedBy: 'company',
        targetEntity: CompanySnapshot::class,
        cascade: ['persist', 'remove'],
        orphanRemoval: true
    )]
    private ?CompanySnapshot $snapshot = null;

    #[ORM\OneToMany(
        mappedBy: 'company',
        targetEntity: Product::class,
        cascade: ['persist', 'remove'],
        orphanRemoval: true
    )]
    #[ORM\OrderBy(['sortOrder' => 'ASC'])]
    private Collection $products;

    #[ORM\OneToMany(
        mappedBy: 'company',
        targetEntity: Material::class,
        cascade: ['persist', 'remove'],
        orphanRemoval: true
    )]
    #[ORM\OrderBy(['sortOrder' => 'ASC'])]
    private Collection $materials;

    #[ORM\OneToMany(
        mappedBy: 'company',
        targetEntity: StaffMember::class,
        cascade: ['persist', 'remove'],
        orphanRemoval: true
    )]
    #[ORM\OrderBy(['sortOrder' => 'ASC'])]
    private Collection $staffMembers;

    #[ORM\OneToMany(
        mappedBy: 'company',
        targetEntity: Expense::class,
        cascade: ['persist', 'remove'],
        orphanRemoval: true
    )]
    #[ORM\OrderBy(['sortOrder' => 'ASC'])]
    private Collection $expenses;

    #[ORM\OneToMany(
        mappedBy: 'company',
        targetEntity: Investment::class,
        cascade: ['persist', 'remove'],
        orphanRemoval: true
    )]
    #[ORM\OrderBy(['sortOrder' => 'ASC'])]
    private Collection $investments;

    // Investissement Terrain — table séparée de l'investissement général,
    // pas de durée d'amortissement (un terrain n'est jamais amorti).
    #[ORM\OneToMany(
        mappedBy: 'company',
        targetEntity: InvestmentTerrain::class,
        cascade: ['persist', 'remove'],
        orphanRemoval: true
    )]
    #[ORM\OrderBy(['sortOrder' => 'ASC'])]
    private Collection $investmentTerrains;

    #[ORM\OneToMany(
        mappedBy: 'company',
        targetEntity: AdditionalFunding::class,
        cascade: ['persist', 'remove'],
        orphanRemoval: true
    )]
    #[ORM\OrderBy(['yearNumber' => 'ASC'])]
    private Collection $additionalFundings;

    #[ORM\OneToMany(
        mappedBy: 'company',
        targetEntity: ActivityLog::class,
        cascade: ['remove'],
        orphanRemoval: true
    )]
    #[ORM\OrderBy(['createdAt' => 'DESC'])]
    private Collection $activityLogs;

    public function __construct()
    {
        $this->createdAt         = new \DateTimeImmutable();
        $this->updatedAt         = new \DateTimeImmutable();
        $this->products          = new ArrayCollection();
        $this->materials         = new ArrayCollection();
        $this->staffMembers      = new ArrayCollection();
        $this->expenses          = new ArrayCollection();
        $this->investments       = new ArrayCollection();
        $this->investmentTerrains = new ArrayCollection();
        $this->additionalFundings = new ArrayCollection();
        $this->activityLogs      = new ArrayCollection();
    }

    #[ORM\PreUpdate]
    public function onPreUpdate(): void
    {
        $this->updatedAt = new \DateTimeImmutable();
    }

    // ──────────── Getters / Setters ────────────

    public function getId(): ?int { return $this->id; }

    public function getProject(): ?Project { return $this->project; }
    public function setProject(?Project $project): static { $this->project = $project; return $this; }

    public function getName(): string { return $this->name; }
    public function setName(string $name): static { $this->name = $name; return $this; }

    public function getSecteur(): ?string { return $this->secteur; }
    public function setSecteur(?string $secteur): static { $this->secteur = $secteur; return $this; }

    public function getPromoteur(): ?string { return $this->promoteur; }
    public function setPromoteur(?string $promoteur): static { $this->promoteur = $promoteur; return $this; }

    public function getDescriptionActivite(): ?string { return $this->descriptionActivite; }
    public function setDescriptionActivite(?string $v): static { $this->descriptionActivite = $v; return $this; }

    public function getMarche(): ?string { return $this->marche; }
    public function setMarche(?string $v): static { $this->marche = $v; return $this; }

    public function getGenre(): ?string { return $this->genre; }
    public function setGenre(?string $v): static { $this->genre = in_array($v, ['femme', 'homme']) ? $v : null; return $this; }

    public function getModeleEconomique(): ?array { return $this->modeleEconomique; }
    public function setModeleEconomique(?array $v): static
    {
        $filtered = array_values(array_unique(array_intersect($v ?? [], ['production', 'service'])));
        $this->modeleEconomique = $filtered !== [] ? $filtered : null;
        return $this;
    }

    public function getEtatActivite(): ?string { return $this->etatActivite; }
    public function setEtatActivite(?string $v): static { $this->etatActivite = in_array($v, ['existante', 'nouvelle']) ? $v : null; return $this; }

    public function getDevise(): string { return $this->devise; }
    public function setDevise(string $devise): static { $this->devise = $devise; return $this; }

    public function getCreatedBy(): ?User { return $this->createdBy; }
    public function setCreatedBy(?User $createdBy): static { $this->createdBy = $createdBy; return $this; }

    public function getLastModifiedBy(): ?User { return $this->lastModifiedBy; }
    public function setLastModifiedBy(?User $lastModifiedBy): static { $this->lastModifiedBy = $lastModifiedBy; return $this; }

    public function getCreatedAt(): \DateTimeImmutable { return $this->createdAt; }
    public function getUpdatedAt(): \DateTimeImmutable { return $this->updatedAt; }

    public function isValidated(): bool { return $this->isValidated; }
    public function getValidatedAt(): ?\DateTimeImmutable { return $this->validatedAt; }
    public function getValidatedBy(): ?User { return $this->validatedBy; }

    public function validate(User $by): static
    {
        $this->isValidated = true;
        $this->validatedAt = new \DateTimeImmutable();
        $this->validatedBy = $by;
        return $this;
    }

    public function unvalidate(): static
    {
        $this->isValidated = false;
        $this->validatedAt = null;
        $this->validatedBy = null;
        return $this;
    }

    public function getSettings(): ?CompanySettings { return $this->settings; }
    public function setSettings(?CompanySettings $settings): static { $this->settings = $settings; return $this; }

    public function getSnapshot(): ?CompanySnapshot { return $this->snapshot; }
    /**
     * Côté inverse de la relation : n'écrit rien en base, mais permet de renvoyer
     * une entreprise tout juste dupliquée avec ses KPI déjà renseignés.
     */
    public function setSnapshot(?CompanySnapshot $snapshot): static { $this->snapshot = $snapshot; return $this; }

    public function getProducts(): Collection { return $this->products; }
    public function getMaterials(): Collection { return $this->materials; }
    public function getStaffMembers(): Collection { return $this->staffMembers; }
    public function getExpenses(): Collection { return $this->expenses; }
    public function getInvestments(): Collection { return $this->investments; }
    public function getInvestmentTerrains(): Collection { return $this->investmentTerrains; }
    public function getAdditionalFundings(): Collection { return $this->additionalFundings; }
    public function getActivityLogs(): Collection { return $this->activityLogs; }
}
