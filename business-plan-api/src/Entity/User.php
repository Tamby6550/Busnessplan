<?php

namespace App\Entity;

use App\Repository\UserRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Security\Core\User\PasswordAuthenticatedUserInterface;
use Symfony\Component\Security\Core\User\UserInterface;
use Symfony\Component\Validator\Constraints as Assert;

#[ORM\Entity(repositoryClass: UserRepository::class)]
#[ORM\Table(name: 'users')]
#[ORM\HasLifecycleCallbacks]
class User implements UserInterface, PasswordAuthenticatedUserInterface
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: 'integer', options: ['unsigned' => true])]
    private ?int $id = null;

    #[ORM\Column(type: 'string', length: 180, unique: true)]
    #[Assert\NotBlank]
    #[Assert\Email]
    private string $email = '';

    #[ORM\Column(type: 'string')]
    private string $passwordHash = '';

    #[ORM\Column(type: 'string', length: 100)]
    #[Assert\NotBlank]
    private string $firstName = '';

    #[ORM\Column(type: 'string', length: 100)]
    #[Assert\NotBlank]
    private string $lastName = '';

    /**
     * Rôle de l'utilisateur.
     * Valeurs : 'admin' | 'manager' | 'editor' | 'viewer' | 'standard'
     *
     * admin    → accès total + gestion des utilisateurs
     * manager  → voit tout, modifie tout (validé + non validé), peut valider
     * editor   → voit tout, modifie uniquement les non-validés
     * viewer   → voit tout, lecture seule
     * standard → ses propres données non validées seulement
     */
    #[ORM\Column(type: 'string', length: 20, options: ['default' => 'standard'])]
    private string $role = 'standard';

    #[ORM\Column(type: 'boolean', options: ['default' => true])]
    private bool $isActive = true;

    #[ORM\Column(type: 'datetime_immutable')]
    private \DateTimeImmutable $createdAt;

    #[ORM\Column(type: 'datetime_immutable', nullable: true)]
    private ?\DateTimeImmutable $lastLoginAt = null;

    // Relations
    #[ORM\OneToMany(mappedBy: 'createdBy', targetEntity: Project::class)]
    private Collection $projects;

    #[ORM\OneToMany(mappedBy: 'createdBy', targetEntity: Company::class)]
    private Collection $companies;

    #[ORM\OneToMany(mappedBy: 'user', targetEntity: ActivityLog::class)]
    private Collection $activityLogs;

    public function __construct()
    {
        $this->createdAt  = new \DateTimeImmutable();
        $this->projects   = new ArrayCollection();
        $this->companies  = new ArrayCollection();
        $this->activityLogs = new ArrayCollection();
    }

    // ──────────── UserInterface ────────────

    public function getUserIdentifier(): string
    {
        return $this->email;
    }

    public function getRoles(): array
    {
        $roles = ['ROLE_USER'];
        if ($this->role === 'admin') {
            $roles[] = 'ROLE_ADMIN';
        }
        return $roles;
    }

    public function eraseCredentials(): void
    {
        // Aucun champ sensible temporaire à effacer
    }

    // ──────────── Getters / Setters ────────────

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getEmail(): string
    {
        return $this->email;
    }

    public function setEmail(string $email): static
    {
        $this->email = $email;
        return $this;
    }

    public function getPassword(): string
    {
        return $this->passwordHash;
    }

    public function setPasswordHash(string $passwordHash): static
    {
        $this->passwordHash = $passwordHash;
        return $this;
    }

    public function getFirstName(): string
    {
        return $this->firstName;
    }

    public function setFirstName(string $firstName): static
    {
        $this->firstName = $firstName;
        return $this;
    }

    public function getLastName(): string
    {
        return $this->lastName;
    }

    public function setLastName(string $lastName): static
    {
        $this->lastName = $lastName;
        return $this;
    }

    public function getFullName(): string
    {
        return trim($this->firstName . ' ' . $this->lastName);
    }

    public function getInitials(): string
    {
        return strtoupper(
            mb_substr($this->firstName, 0, 1) . mb_substr($this->lastName, 0, 1)
        );
    }

    public function getRole(): string { return $this->role; }

    public function setRole(string $role): static
    {
        $valid = ['admin', 'manager', 'editor', 'viewer', 'standard'];
        $this->role = in_array($role, $valid, true) ? $role : 'standard';
        return $this;
    }

    // ── Méthodes de compatibilité (dérivées du rôle) ──────────────────────────

    /** Vrai uniquement pour les administrateurs (gestion des utilisateurs) */
    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    /** Peut voir toutes les données (admin, manager, editor, viewer) */
    public function isCanView(): bool
    {
        return in_array($this->role, ['admin', 'manager', 'editor', 'viewer'], true);
    }

    /** Peut modifier les BP non validés (admin, manager, editor) */
    public function isCanEdit(): bool
    {
        return in_array($this->role, ['admin', 'manager', 'editor'], true);
    }

    /** Peut modifier les BP déjà validés (admin, manager) */
    public function isCanEditValidated(): bool
    {
        return in_array($this->role, ['admin', 'manager'], true);
    }

    /** Peut valider / dévalider un BP (admin, manager) */
    public function isCanValidate(): bool
    {
        return in_array($this->role, ['admin', 'manager'], true);
    }

    /** Peut utiliser l'export Excel / Power Query (admin, manager) */
    public function isCanExport(): bool
    {
        return in_array($this->role, ['admin', 'manager'], true);
    }

    /** Peut dupliquer un projet entier et copier une entreprise vers un autre projet (admin, manager) */
    public function isCanDuplicateProject(): bool
    {
        return in_array($this->role, ['admin', 'manager'], true);
    }

    public function isActive(): bool { return $this->isActive; }
    public function setIsActive(bool $isActive): static { $this->isActive = $isActive; return $this; }

    public function getCreatedAt(): \DateTimeImmutable
    {
        return $this->createdAt;
    }

    public function getLastLoginAt(): ?\DateTimeImmutable
    {
        return $this->lastLoginAt;
    }

    public function setLastLoginAt(?\DateTimeImmutable $lastLoginAt): static
    {
        $this->lastLoginAt = $lastLoginAt;
        return $this;
    }

    public function getProjects(): Collection
    {
        return $this->projects;
    }

    public function getCompanies(): Collection
    {
        return $this->companies;
    }

    public function getActivityLogs(): Collection
    {
        return $this->activityLogs;
    }
}
