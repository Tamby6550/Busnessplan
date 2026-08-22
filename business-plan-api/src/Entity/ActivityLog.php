<?php

namespace App\Entity;

use App\Repository\ActivityLogRepository;
use Doctrine\ORM\Mapping as ORM;

/**
 * Journal d'activité : trace chaque modification par utilisateur.
 * Stocké en base, visible dans le drawer "Historique d'activité".
 */
#[ORM\Entity(repositoryClass: ActivityLogRepository::class)]
#[ORM\Table(name: 'activity_logs')]
#[ORM\Index(name: 'idx_company_date', columns: ['company_id', 'created_at'])]
#[ORM\Index(name: 'idx_user', columns: ['user_id'])]
class ActivityLog
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: 'integer', options: ['unsigned' => true])]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: Company::class, inversedBy: 'activityLogs')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private ?Company $company = null;

    #[ORM\ManyToOne(targetEntity: User::class, inversedBy: 'activityLogs')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'RESTRICT')]
    private ?User $user = null;

    // Section de l'éditeur concernée (ex. 'entreprise', 'produits', 'personnel'...)
    #[ORM\Column(type: 'string', length: 50)]
    private string $section = '';

    // Type d'action : 'update', 'add_row', 'delete_row', 'duplicate', 'create', 'delete'
    #[ORM\Column(type: 'string', length: 30)]
    private string $action = '';

    // Type d'entité modifiée (ex. 'product', 'material', 'staff_member'...)
    #[ORM\Column(type: 'string', length: 50, nullable: true)]
    private ?string $entityType = null;

    // ID de l'entité modifiée (null si pas de sous-entité)
    #[ORM\Column(type: 'integer', nullable: true, options: ['unsigned' => true])]
    private ?int $entityId = null;

    // Nom du champ modifié (ex. 'name', 'price', 'monthly_salary'...)
    #[ORM\Column(type: 'string', length: 100, nullable: true)]
    private ?string $fieldName = null;

    // Ancienne valeur (stockée en texte pour flexibilité)
    #[ORM\Column(type: 'text', nullable: true)]
    private ?string $oldValue = null;

    // Nouvelle valeur
    #[ORM\Column(type: 'text', nullable: true)]
    private ?string $newValue = null;

    #[ORM\Column(type: 'datetime_immutable')]
    private \DateTimeImmutable $createdAt;

    public function __construct()
    {
        $this->createdAt = new \DateTimeImmutable();
    }

    // ──────────── Getters / Setters ────────────

    public function getId(): ?int { return $this->id; }

    public function getCompany(): ?Company { return $this->company; }
    public function setCompany(?Company $company): static { $this->company = $company; return $this; }

    public function getUser(): ?User { return $this->user; }
    public function setUser(?User $user): static { $this->user = $user; return $this; }

    public function getSection(): string { return $this->section; }
    public function setSection(string $section): static { $this->section = $section; return $this; }

    public function getAction(): string { return $this->action; }
    public function setAction(string $action): static { $this->action = $action; return $this; }

    public function getEntityType(): ?string { return $this->entityType; }
    public function setEntityType(?string $entityType): static { $this->entityType = $entityType; return $this; }

    public function getEntityId(): ?int { return $this->entityId; }
    public function setEntityId(?int $entityId): static { $this->entityId = $entityId; return $this; }

    public function getFieldName(): ?string { return $this->fieldName; }
    public function setFieldName(?string $fieldName): static { $this->fieldName = $fieldName; return $this; }

    public function getOldValue(): ?string { return $this->oldValue; }
    public function setOldValue(?string $oldValue): static { $this->oldValue = $oldValue; return $this; }

    public function getNewValue(): ?string { return $this->newValue; }
    public function setNewValue(?string $newValue): static { $this->newValue = $newValue; return $this; }

    public function getCreatedAt(): \DateTimeImmutable { return $this->createdAt; }
}
