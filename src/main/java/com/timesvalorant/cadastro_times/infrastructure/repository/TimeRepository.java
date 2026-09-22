package com.timesvalorant.cadastro_times.infrastructure.repository;

import com.timesvalorant.cadastro_times.infrastructure.entitys.Time;
import jakarta.transaction.Transactional;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface TimeRepository extends JpaRepository<Time,Integer> {

    Optional<Time> findByNome(String nome);

    @Transactional
    void deleteByNome(String nome);
}
