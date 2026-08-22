<?php

namespace App\EventListener;

use App\Repository\UserRepository;
use Lexik\Bundle\JWTAuthenticationBundle\Event\JWTDecodedEvent;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;

/**
 * Vérifie à chaque requête JWT que l'utilisateur est toujours actif.
 * Bloque les tokens valides des comptes désactivés ou supprimés.
 */
class JwtAuthListener
{
    public function __construct(
        private readonly UserRepository $userRepository,
    ) {}

    public function onJwtDecoded(JWTDecodedEvent $event): void
    {
        $payload = $event->getPayload();
        $email   = $payload['username'] ?? null;

        if (!$email) {
            $event->markAsInvalid();
            return;
        }

        $user = $this->userRepository->findOneBy(['email' => $email]);

        // Compte supprimé ou désactivé → token invalide
        if (!$user || !$user->isActive()) {
            $event->markAsInvalid();
        }
    }
}
