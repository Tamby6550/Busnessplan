<?php

namespace App\Entity;

use App\Repository\ProductRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Validator\Constraints as Assert;

#[ORM\Entity(repositoryClass: ProductRepository::class)]
#[ORM\Table(name: 'products')]
#[ORM\HasLifecycleCallbacks]
class Product
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: 'integer', options: ['unsigned' => true])]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: Company::class, inversedBy: 'products')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private ?Company $company = null;

    #[ORM\Column(type: 'string', length: 255, options: ['default' => 'Produit'])]
    #[Assert\NotBlank]
    private string $name = 'Produit';

    // Prix unitaire en Ariary — mois 1 (Janvier). Historique : seul prix avant l'introduction
    // du prix mensuel ; conservé tel quel pour ne pas perdre les données déjà saisies.
    #[ORM\Column(type: 'bigint', options: ['default' => 0])]
    private int $price = 0;

    // Prix unitaire des mois 2 à 12 (Février à Décembre) — permet une variation saisonnière
    // (ex : prix du poisson plus élevé à certaines périodes). Colonnes séparées (pas de JSON),
    // exposées ensemble via getMonthlyPrices()/setMonthlyPrices() ci-dessous.
    #[ORM\Column(type: 'bigint', options: ['default' => 0])]
    private int $priceM2 = 0;
    #[ORM\Column(type: 'bigint', options: ['default' => 0])]
    private int $priceM3 = 0;
    #[ORM\Column(type: 'bigint', options: ['default' => 0])]
    private int $priceM4 = 0;
    #[ORM\Column(type: 'bigint', options: ['default' => 0])]
    private int $priceM5 = 0;
    #[ORM\Column(type: 'bigint', options: ['default' => 0])]
    private int $priceM6 = 0;
    #[ORM\Column(type: 'bigint', options: ['default' => 0])]
    private int $priceM7 = 0;
    #[ORM\Column(type: 'bigint', options: ['default' => 0])]
    private int $priceM8 = 0;
    #[ORM\Column(type: 'bigint', options: ['default' => 0])]
    private int $priceM9 = 0;
    #[ORM\Column(type: 'bigint', options: ['default' => 0])]
    private int $priceM10 = 0;
    #[ORM\Column(type: 'bigint', options: ['default' => 0])]
    private int $priceM11 = 0;
    #[ORM\Column(type: 'bigint', options: ['default' => 0])]
    private int $priceM12 = 0;

    // Quantités mensuelles An 1 — tableau JSON de 12 valeurs entières
    #[ORM\Column(type: 'json')]
    private array $monthlyQty = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

    // Taux de croissance des quantités An 1-5 — tableau JSON de 5 valeurs décimales
    #[ORM\Column(type: 'json')]
    private array $growthRates = [0, 0, 0, 0, 0];

    // Ordre d'affichage dans le tableau
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

    // ──────────── Getters / Setters ────────────

    public function getId(): ?int { return $this->id; }

    public function getCompany(): ?Company { return $this->company; }
    public function setCompany(?Company $company): static { $this->company = $company; return $this; }

    public function getName(): string { return $this->name; }
    public function setName(string $name): static { $this->name = $name; return $this; }

    public function getPrice(): int { return (int) $this->price; }
    public function setPrice(int $price): static { $this->price = $price; return $this; }

    /** Prix des 12 mois, dans l'ordre [Janvier..Décembre]. */
    public function getMonthlyPrices(): array
    {
        return [
            $this->price, $this->priceM2, $this->priceM3, $this->priceM4,
            $this->priceM5, $this->priceM6, $this->priceM7, $this->priceM8,
            $this->priceM9, $this->priceM10, $this->priceM11, $this->priceM12,
        ];
    }

    /** Définit les 12 mois d'un coup (tableau [Janvier..Décembre]) ; complète avec 0 si incomplet. */
    public function setMonthlyPrices(array $values): static
    {
        $v = array_pad(array_slice(array_map('intval', array_values($values)), 0, 12), 12, 0);
        [
            $this->price, $this->priceM2, $this->priceM3, $this->priceM4,
            $this->priceM5, $this->priceM6, $this->priceM7, $this->priceM8,
            $this->priceM9, $this->priceM10, $this->priceM11, $this->priceM12,
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

    /** Quantité totale annuelle An 1 (décimales autorisées, ex: 2.75) */
    public function getTotalAnnualQty(): int|float
    {
        return array_sum($this->monthlyQty);
    }
}
